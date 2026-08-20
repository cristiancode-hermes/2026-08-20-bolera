import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import {
  Booking,
  BookingLine,
  BookingStatus,
  EmailLog,
  Favorite,
  Lane,
  LaneSlot,
  MenuItem,
  Review,
  User,
} from '../entities/entities';
import {
  POINTS_PER_COMPLETED,
  addDaysYmd,
  buildQrPlaceholderSvg,
  madridDate,
  sumLines,
} from '../common/booking-rules';

const LANE_DEFS = [
  { number: 1, name: 'Pista Rayo', description: 'Pista clásica junto a la entrada. Ideal para grupos principiantes.', basePriceCents: 2800, imageKey: 'lane-1' },
  { number: 2, name: 'Pista Truenos', description: 'Superficie rápida y luces LED. Favorita de los habituales.', basePriceCents: 3000, imageKey: 'lane-2' },
  { number: 3, name: 'Pista Cometa', description: 'Ambiente familiar con marcador digital renovado.', basePriceCents: 2600, imageKey: 'lane-3' },
  { number: 4, name: 'Pista Nebulosa', description: 'Zona VIP con sofás laterales y servicio de bar prioritario.', basePriceCents: 3600, imageKey: 'lane-4' },
  { number: 5, name: 'Pista Aurora', description: 'Iluminación cambiante y música ambiente. Perfecta para cumpleaños.', basePriceCents: 3200, imageKey: 'lane-5' },
  { number: 6, name: 'Pista Meteoro', description: 'Pista de competición con aceitado profesional.', basePriceCents: 3400, imageKey: 'lane-6' },
  { number: 7, name: 'Pista Órbita', description: 'Espacio amplio para grupos de hasta 6 jugadores.', basePriceCents: 2900, imageKey: 'lane-7' },
  { number: 8, name: 'Pista Eclipse', description: 'Sesiones nocturnas con glow-bowling los viernes.', basePriceCents: 3500, imageKey: 'lane-8' },
];

const MENU_DEFS = [
  { name: 'Nachos con queso', description: 'Ración generosa con jalapeños', priceCents: 450 },
  { name: 'Patatas gajo', description: 'Con salsa BBQ', priceCents: 380 },
  { name: 'Refresco 33cl', description: 'Cola, limón o naranja', priceCents: 250 },
  { name: 'Cerveza 33cl', description: 'Caña embotellada', priceCents: 320 },
  { name: 'Agua 50cl', description: 'Mineral', priceCents: 180 },
  { name: 'Pack snacks duo', description: 'Nachos + 2 refrescos', priceCents: 890 },
];

const TIMES = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

function endOf(start: string): string {
  const [h, m] = start.split(':').map(Number);
  return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger('Seed');

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Lane) private readonly lanes: Repository<Lane>,
    @InjectRepository(LaneSlot) private readonly slots: Repository<LaneSlot>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(BookingLine) private readonly lines: Repository<BookingLine>,
    @InjectRepository(MenuItem) private readonly menu: Repository<MenuItem>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(EmailLog) private readonly emails: Repository<EmailLog>,
    @InjectRepository(Favorite) private readonly favs: Repository<Favorite>,
  ) {}

  async onModuleInit() {
    const count = await this.users.count();
    if (count > 0) {
      this.logger.log('DB already seeded — skip');
      return;
    }
    await this.seed();
  }

  async seed() {
    this.logger.log('Seeding Bolera…');
    const hash = await bcrypt.hash('demo1234', 10);

    const demo = (await this.users.save({
      username: 'demo',
      email: 'demo@bolera.dev',
      passwordHash: hash,
      role: 'player',
      points: 0,
    } as any)) as User;

    const staff = (await this.users.save({
      username: 'staff',
      email: 'staff@bolera.dev',
      passwordHash: hash,
      role: 'staff',
      points: 0,
    } as any)) as User;

    const admin = (await this.users.save({
      username: 'admin',
      email: 'admin@bolera.dev',
      passwordHash: hash,
      role: 'admin',
      points: 0,
    } as any)) as User;

    void staff;
    void admin;

    const lanes: Lane[] = [];
    for (const def of LANE_DEFS) {
      lanes.push(
        (await this.lanes.save({
          ...def,
          maxPlayers: 6,
          shoePriceCents: 200,
          active: true,
        } as any)) as Lane,
      );
    }

    const menuItems: MenuItem[] = [];
    for (const def of MENU_DEFS) {
      menuItems.push((await this.menu.save({ ...def, active: true } as any)) as MenuItem);
    }

    const today = madridDate();
    const allSlots: LaneSlot[] = [];
    for (let d = 0; d < 8; d++) {
      const date = addDaysYmd(today, d);
      for (const lane of lanes) {
        for (const startTime of TIMES) {
          const s = (await this.slots.save({
            laneId: lane.id,
            date,
            startTime,
            endTime: endOf(startTime),
            blocked: false,
          } as any)) as LaneSlot;
          allSlots.push(s);
        }
      }
    }

    // Helper to create booking with lines
    const makeBooking = async (opts: {
      userId: number;
      slot: LaneSlot;
      lane: Lane;
      status: BookingStatus;
      partySize: number;
      bringOwnShoes?: boolean;
      expiresAt?: Date | null;
      withCode?: boolean;
      addon?: MenuItem;
      createdOffsetDays?: number;
    }) => {
      const lineDefs: {
        kind: 'base' | 'shoe' | 'addon';
        label: string;
        qty: number;
        unitPriceCents: number;
        menuItemId: number | null;
      }[] = [
        {
          kind: 'base',
          label: `Pista ${opts.lane.number} — ${opts.slot.startTime}`,
          qty: 1,
          unitPriceCents: opts.lane.basePriceCents,
          menuItemId: null,
        },
      ];
      if (!opts.bringOwnShoes) {
        lineDefs.push({
          kind: 'shoe',
          label: 'Alquiler de zapatos',
          qty: opts.partySize,
          unitPriceCents: opts.lane.shoePriceCents,
          menuItemId: null,
        });
      }
      if (opts.addon) {
        lineDefs.push({
          kind: 'addon',
          label: opts.addon.name,
          qty: 1,
          unitPriceCents: opts.addon.priceCents,
          menuItemId: opts.addon.id,
        });
      }
      const totalCents = sumLines(lineDefs);
      const now = new Date();
      if (opts.createdOffsetDays) {
        now.setDate(now.getDate() + opts.createdOffsetDays);
      }
      let code: string | null = null;
      let qrToken: string | null = null;
      if (opts.withCode || ['confirmed', 'completed', 'no_show'].includes(opts.status)) {
        code = 'BL-' + randomBytes(3).toString('hex').toUpperCase();
        qrToken = randomBytes(16).toString('hex');
      }
      const booking = (await this.bookings.save({
        userId: opts.userId,
        slotId: opts.slot.id,
        partySize: opts.partySize,
        status: opts.status,
        totalCents,
        expiresAt: opts.expiresAt ?? null,
        qrToken,
        code,
        bringOwnShoes: !!opts.bringOwnShoes,
        createdAt: now,
        updatedAt: now,
      } as any)) as Booking;

      for (const ld of lineDefs) {
        await this.lines.save({
          bookingId: booking.id,
          ...ld,
        } as any);
      }

      if (opts.status === 'confirmed' || opts.status === 'completed') {
        await this.emails.save({
          userId: opts.userId,
          bookingId: booking.id,
          toEmail: demo.email,
          subject: `Bolera — Reserva ${code}`,
          body: `Código ${code}\nQR ${qrToken}\n${buildQrPlaceholderSvg(qrToken!, code!)}`,
        } as any);
      }
      return booking;
    };

    // Pick distinct slots for various statuses
    const slotAt = (laneIdx: number, dayOffset: number, timeIdx: number) => {
      const date = addDaysYmd(today, dayOffset);
      const lane = lanes[laneIdx];
      return allSlots.find(
        (s) => s.laneId === lane.id && s.date === date && s.startTime === TIMES[timeIdx],
      )!;
    };

    // completed (past-ish slots day 0 early) — 2 completed for demo points
    await makeBooking({
      userId: demo.id,
      slot: slotAt(0, 0, 0),
      lane: lanes[0],
      status: 'completed',
      partySize: 4,
      withCode: true,
      addon: menuItems[0],
      createdOffsetDays: -3,
    });
    await makeBooking({
      userId: demo.id,
      slot: slotAt(1, 0, 1),
      lane: lanes[1],
      status: 'completed',
      partySize: 2,
      withCode: true,
      createdOffsetDays: -2,
    });

    // confirmed upcoming
    await makeBooking({
      userId: demo.id,
      slot: slotAt(2, 2, 3),
      lane: lanes[2],
      status: 'confirmed',
      partySize: 5,
      withCode: true,
      addon: menuItems[5],
    });

    // cancelled
    await makeBooking({
      userId: demo.id,
      slot: slotAt(3, 1, 2),
      lane: lanes[3],
      status: 'cancelled',
      partySize: 3,
    });

    // expired
    await makeBooking({
      userId: demo.id,
      slot: slotAt(4, 1, 4),
      lane: lanes[4],
      status: 'expired',
      partySize: 2,
      expiresAt: null,
    });

    // no_show
    await makeBooking({
      userId: demo.id,
      slot: slotAt(5, 0, 2),
      lane: lanes[5],
      status: 'no_show',
      partySize: 4,
      withCode: true,
    });

    // live pending (future expires)
    await makeBooking({
      userId: demo.id,
      slot: slotAt(6, 3, 1),
      lane: lanes[6],
      status: 'pending',
      partySize: 3,
      expiresAt: new Date(Date.now() + 12 * 60 * 1000),
    });

    // expired pending (for sweeper)
    await makeBooking({
      userId: demo.id,
      slot: slotAt(7, 3, 2),
      lane: lanes[7],
      status: 'pending',
      partySize: 2,
      expiresAt: new Date(Date.now() - 5 * 60 * 1000),
    });

    // points = completed * 15
    const completedCount = await this.bookings.count({
      where: { userId: demo.id, status: 'completed' },
    });
    demo.points = completedCount * POINTS_PER_COMPLETED;
    await this.users.save(demo);

    // 4 reviews
    const reviewBodies = [
      { laneId: lanes[0].id, rating: 5, body: '¡Strike total! Personal amable y zapatos limpios.' },
      { laneId: lanes[1].id, rating: 4, body: 'Muy buena pista, un poco ruidosa a las 20h.' },
      { laneId: lanes[2].id, rating: 5, body: 'Perfecta para el equipo. Volveremos.' },
      { laneId: lanes[4].id, rating: 3, body: 'Bien, pero el bar tardó con los nachos.' },
    ];
    for (const r of reviewBodies) {
      await this.reviews.save({
        userId: demo.id,
        laneId: r.laneId,
        rating: r.rating,
        body: r.body,
      } as any);
    }

    await this.favs.save({ userId: demo.id, laneId: lanes[0].id } as any);
    await this.favs.save({ userId: demo.id, laneId: lanes[3].id } as any);

    this.logger.log(
      `Seed OK: users=3 lanes=${lanes.length} slots=${allSlots.length} menu=${menuItems.length} bookings+reviews`,
    );
  }
}
