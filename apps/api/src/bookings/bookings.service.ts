import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import {
  Booking,
  BookingLine,
  EmailLog,
  Lane,
  LaneSlot,
  MenuItem,
  User,
} from '../entities/entities';
import { Mutex } from '../common/mutex';
import {
  CANCEL_HOURS,
  HOLD_MINUTES,
  POINTS_PER_COMPLETED,
  buildQrPlaceholderSvg,
  canCancelByPolicy,
  canTransition,
  parseMadridLocal,
  sumLines,
  validatePartySize,
} from '../common/booking-rules';
import { HoldBookingDto } from './bookings.dto';

function conflict(code: string, message: string) {
  return new HttpException(
    { statusCode: 409, code, message },
    HttpStatus.CONFLICT,
  );
}

@Injectable()
export class BookingsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('BookingSweeper');
  private readonly mutex = new Mutex();
  private sweeper: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(BookingLine) private readonly lines: Repository<BookingLine>,
    @InjectRepository(LaneSlot) private readonly slots: Repository<LaneSlot>,
    @InjectRepository(Lane) private readonly lanes: Repository<Lane>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(MenuItem) private readonly menu: Repository<MenuItem>,
    @InjectRepository(EmailLog) private readonly emails: Repository<EmailLog>,
    private readonly dataSource: DataSource,
  ) {}

  onModuleInit() {
    this.sweeper = setInterval(() => {
      void this.expireStale().then((n) => {
        if (n > 0) this.logger.log(`${n} booking(s) pending vencido(s)`);
      });
    }, 30_000);
    this.sweeper.unref?.();
  }

  onModuleDestroy() {
    if (this.sweeper) clearInterval(this.sweeper);
  }

  async expireStale(): Promise<number> {
    const now = new Date();
    const pendings = await this.bookings.find({ where: { status: 'pending' } });
    let n = 0;
    for (const b of pendings) {
      if (b.expiresAt && new Date(b.expiresAt) < now) {
        b.status = 'expired';
        b.expiresAt = null;
        b.updatedAt = new Date();
        await this.bookings.save(b);
        n += 1;
      }
    }
    return n;
  }

  async hold(userId: number, slotId: number, dto: HoldBookingDto) {
    return this.mutex.run(async () => {
      await this.expireStale();

      // No setLock on better-sqlite3
      const supportsLock = this.dataSource.options.type !== 'better-sqlite3';
      const qb = this.slots.createQueryBuilder('s').where('s.id = :id', { id: slotId });
      const slot = supportsLock
        ? await qb.setLock('pessimistic_write').getOne()
        : await qb.getOne();
      if (!slot) throw new NotFoundException('Franja no encontrada');
      if (slot.blocked) {
        throw conflict('SLOT_TAKEN', 'La franja está bloqueada');
      }

      const lane = await this.lanes.findOne({ where: { id: slot.laneId, active: true } });
      if (!lane) throw new NotFoundException('Pista no disponible');

      const partyCheck = validatePartySize(dto.partySize, lane.maxPlayers);
      if (!partyCheck.ok) {
        throw new HttpException(
          {
            statusCode: 400,
            code: 'INVALID_PARTY_SIZE',
            message: `partySize debe ser 1–${lane.maxPlayers}`,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const existingOnSlot = await this.bookings.find({
        where: [
          { slotId: slot.id, status: 'pending' },
          { slotId: slot.id, status: 'confirmed' },
        ],
      });
      const live = existingOnSlot.filter((b) => {
        if (b.status === 'confirmed') return true;
        return b.expiresAt && new Date(b.expiresAt) > new Date();
      });
      if (live.length > 0) {
        throw conflict('SLOT_TAKEN', 'Esta franja ya está reservada');
      }

      const dup = await this.bookings.findOne({
        where: [
          { userId, slotId: slot.id, status: 'pending' },
          { userId, slotId: slot.id, status: 'confirmed' },
        ],
      });
      if (dup) {
        throw conflict(
          'DUPLICATE_USER_SLOT',
          'Ya tienes una reserva activa en esta pista y franja',
        );
      }

      const lineDefs: {
        kind: 'base' | 'shoe' | 'addon';
        label: string;
        qty: number;
        unitPriceCents: number;
        menuItemId: number | null;
      }[] = [];

      lineDefs.push({
        kind: 'base',
        label: `Pista ${lane.number} — ${slot.startTime}`,
        qty: 1,
        unitPriceCents: lane.basePriceCents,
        menuItemId: null,
      });

      const bringOwn = !!dto.bringOwnShoes;
      if (!bringOwn) {
        const shoeQty =
          dto.shoeSizes && dto.shoeSizes.length > 0
            ? dto.shoeSizes.length
            : dto.partySize;
        if (shoeQty > 0) {
          lineDefs.push({
            kind: 'shoe',
            label: 'Alquiler de zapatos',
            qty: shoeQty,
            unitPriceCents: lane.shoePriceCents,
            menuItemId: null,
          });
        }
      }

      if (dto.addonIds?.length) {
        const items = await this.menu.find({
          where: { id: In(dto.addonIds), active: true },
        });
        for (const item of items) {
          lineDefs.push({
            kind: 'addon',
            label: item.name,
            qty: 1,
            unitPriceCents: item.priceCents,
            menuItemId: item.id,
          });
        }
      }

      const totalCents = sumLines(lineDefs);
      const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
      const now = new Date();

      const booking = (await this.bookings.save({
        userId,
        slotId: slot.id,
        partySize: dto.partySize,
        status: 'pending',
        totalCents,
        expiresAt,
        qrToken: null,
        code: null,
        bringOwnShoes: bringOwn,
        createdAt: now,
        updatedAt: now,
      } as any)) as Booking;

      for (const ld of lineDefs) {
        await this.lines.save({
          bookingId: booking.id,
          kind: ld.kind,
          label: ld.label,
          qty: ld.qty,
          unitPriceCents: ld.unitPriceCents,
          menuItemId: ld.menuItemId,
        } as any);
      }

      return { booking: await this.loadView(booking.id) };
    });
  }

  async confirm(userId: number, id: number) {
    // Expire outside throw txn
    const pre = await this.bookings.findOne({ where: { id } });
    if (!pre) throw new NotFoundException('Reserva no encontrada');
    if (pre.userId !== userId) throw new ForbiddenException('No es tu reserva');

    if (
      pre.status === 'pending' &&
      pre.expiresAt &&
      new Date(pre.expiresAt) < new Date()
    ) {
      await this.dataSource.transaction(async (m) => {
        const repo = m.getRepository(Booking);
        const b = await repo.findOne({ where: { id } });
        if (b && b.status === 'pending') {
          b.status = 'expired';
          b.expiresAt = null;
          b.updatedAt = new Date();
          await repo.save(b);
        }
      });
      throw conflict('HOLD_EXPIRED', 'La retención expiró — elige otra franja');
    }

    return this.mutex.run(async () => {
      const b = await this.bookings.findOne({
        where: { id },
        relations: { lines: true, slot: { lane: true }, user: true },
      });
      if (!b) throw new NotFoundException('Reserva no encontrada');
      if (b.userId !== userId) throw new ForbiddenException('No es tu reserva');
      if (!canTransition(b.status, 'confirmed')) {
        throw new ConflictException(`No se puede confirmar desde ${b.status}`);
      }

      b.status = 'confirmed';
      b.expiresAt = null;
      b.code = await this.generateCode();
      b.qrToken = randomBytes(16).toString('hex');
      b.updatedAt = new Date();
      await this.bookings.save(b);

      const user = await this.users.findOne({ where: { id: userId } });
      let emailPreview: { to: string; subject: string; body: string } | null = null;
      if (user) {
        const subject = `Bolera — Reserva confirmada ${b.code}`;
        const body = `Hola ${user.username},\n\nTu reserva está confirmada.\nCódigo: ${b.code}\nFranja: ${b.slot?.date} ${b.slot?.startTime}-${b.slot?.endTime}\nPista: ${b.slot?.lane?.name || ''}\nQR: ${b.qrToken}\n\n¡A rodar! — Bolera`;
        await this.emails.save({
          userId,
          bookingId: b.id,
          toEmail: user.email,
          subject,
          body,
        } as any);
        emailPreview = { to: user.email, subject, body };
      }

      const booking = await this.loadView(b.id);
      const qrSvg = buildQrPlaceholderSvg(b.qrToken!, b.code!);
      return { booking, qrSvg, emailPreview };
    });
  }

  async listMine(
    userId: number,
    opts?: { status?: string; scope?: string },
  ) {
    await this.expireStale();
    const rows = await this.bookings.find({
      where: { userId },
      relations: { lines: true, slot: { lane: true } },
      order: { createdAt: 'DESC' },
    });
    let items = rows.map((b) => this.listView(b));
    if (opts?.status) {
      items = items.filter((i) => i.status === opts.status);
    }
    if (opts?.scope === 'upcoming') {
      items = items.filter((i) =>
        ['pending', 'confirmed'].includes(i.status),
      );
    } else if (opts?.scope === 'past') {
      items = items.filter((i) =>
        ['completed', 'cancelled', 'expired', 'no_show'].includes(i.status),
      );
    }
    return { items, total: items.length };
  }

  async detail(userId: number, id: number, role: string) {
    await this.expireStale();
    const b = await this.bookings.findOne({
      where: { id },
      relations: { lines: true, slot: { lane: true }, user: true },
    });
    if (!b) throw new NotFoundException('Reserva no encontrada');
    if (b.userId !== userId && role !== 'staff' && role !== 'admin') {
      throw new ForbiddenException('No es tu reserva');
    }
    const booking = this.detailView(b);
    const qrSvg =
      b.qrToken && b.code ? buildQrPlaceholderSvg(b.qrToken, b.code) : null;
    return { booking, lines: booking.lines, qrSvg };
  }

  async cancel(userId: number, id: number) {
    return this.mutex.run(async () => {
      const b = await this.bookings.findOne({
        where: { id },
        relations: { lines: true, slot: { lane: true } },
      });
      if (!b) throw new NotFoundException('Reserva no encontrada');
      if (b.userId !== userId) throw new ForbiddenException('No es tu reserva');
      if (!canTransition(b.status, 'cancelled')) {
        throw new ConflictException(`No se puede cancelar desde ${b.status}`);
      }

      if (b.status === 'confirmed' && b.slot) {
        const start = parseMadridLocal(b.slot.date, b.slot.startTime);
        const hours = (start.getTime() - Date.now()) / 3_600_000;
        if (!canCancelByPolicy(hours, CANCEL_HOURS)) {
          throw new HttpException(
            {
              statusCode: 400,
              code: 'CANCEL_TOO_LATE',
              message: `Cancelación solo hasta ${CANCEL_HOURS}h antes de la franja`,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      b.status = 'cancelled';
      b.expiresAt = null;
      b.updatedAt = new Date();
      await this.bookings.save(b);
      return { booking: await this.loadView(id) };
    });
  }

  async complete(staffUserId: number, id: number) {
    const staff = await this.users.findOne({ where: { id: staffUserId } });
    if (!staff || (staff.role !== 'staff' && staff.role !== 'admin')) {
      throw new ForbiddenException();
    }
    const b = await this.bookings.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Reserva no encontrada');
    if (!canTransition(b.status, 'completed')) {
      throw new ConflictException(`No se puede completar desde ${b.status}`);
    }
    b.status = 'completed';
    b.updatedAt = new Date();
    await this.bookings.save(b);

    const completedCount = await this.bookings.count({
      where: { userId: b.userId, status: 'completed' },
    });
    const pointsAwarded = POINTS_PER_COMPLETED; // this booking
    const user = await this.users.findOne({ where: { id: b.userId } });
    if (user) {
      user.points = completedCount * POINTS_PER_COMPLETED;
      await this.users.save(user);
    }
    return {
      booking: await this.loadView(id),
      pointsAwarded,
    };
  }

  async noShow(staffUserId: number, id: number) {
    const staff = await this.users.findOne({ where: { id: staffUserId } });
    if (!staff || (staff.role !== 'staff' && staff.role !== 'admin')) {
      throw new ForbiddenException();
    }
    const b = await this.bookings.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Reserva no encontrada');
    if (!canTransition(b.status, 'no_show')) {
      throw new ConflictException(`No se puede marcar no_show desde ${b.status}`);
    }
    b.status = 'no_show';
    b.updatedAt = new Date();
    await this.bookings.save(b);
    return { booking: await this.loadView(id) };
  }

  private async loadView(id: number) {
    const b = await this.bookings.findOne({
      where: { id },
      relations: { lines: true, slot: { lane: true } },
    });
    if (!b) throw new NotFoundException();
    return this.detailView(b);
  }

  listView(b: Booking) {
    const linesSum = sumLines(b.lines || []);
    return {
      id: b.id,
      status: b.status,
      partySize: b.partySize,
      totalCents: b.totalCents,
      linesTotalCents: linesSum,
      code: b.code,
      bringOwnShoes: b.bringOwnShoes,
      expiresAt: b.expiresAt ? new Date(b.expiresAt).toISOString() : null,
      createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : null,
      updatedAt: b.updatedAt ? new Date(b.updatedAt).toISOString() : null,
      slot: b.slot
        ? {
            id: b.slot.id,
            date: b.slot.date,
            startTime: b.slot.startTime,
            endTime: b.slot.endTime,
            laneId: b.slot.laneId,
            lane: b.slot.lane
              ? {
                  id: b.slot.lane.id,
                  number: b.slot.lane.number,
                  name: b.slot.lane.name,
                }
              : null,
          }
        : null,
    };
  }

  detailView(b: Booking) {
    const base = this.listView(b);
    return {
      ...base,
      userId: b.userId,
      slotId: b.slotId,
      qrToken: b.qrToken,
      lines: (b.lines || []).map((l) => ({
        id: l.id,
        kind: l.kind,
        label: l.label,
        qty: l.qty,
        unitPriceCents: l.unitPriceCents,
        subtotalCents: l.qty * l.unitPriceCents,
        menuItemId: l.menuItemId,
      })),
      qrSvg:
        b.qrToken && b.code
          ? buildQrPlaceholderSvg(b.qrToken, b.code)
          : null,
    };
  }

  private async generateCode(): Promise<string> {
    for (let i = 0; i < 8; i++) {
      const code = 'BL-' + randomBytes(3).toString('hex').toUpperCase();
      const exists = await this.bookings.findOne({ where: { code } });
      if (!exists) return code;
    }
    return 'BL-' + Date.now().toString(36).toUpperCase();
  }
}
