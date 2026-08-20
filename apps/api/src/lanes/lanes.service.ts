import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lane, Review, Booking, LaneSlot } from '../entities/entities';
import { CreateLaneDto, UpdateLaneDto } from './lanes.dto';
import { madridDate } from '../common/booking-rules';
import { isLivePending } from '../common/booking-rules';

@Injectable()
export class LanesService {
  constructor(
    @InjectRepository(Lane) private readonly lanes: Repository<Lane>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(LaneSlot) private readonly slots: Repository<LaneSlot>,
  ) {}

  /** Count free (not blocked / not held / not booked) slots for a lane on a date. */
  private async freeSlotsFor(laneId: number, date: string): Promise<number> {
    const slots = await this.slots.find({ where: { laneId, date, blocked: false } });
    let free = 0;
    for (const s of slots) {
      const bks = await this.bookings.find({ where: { slotId: s.id } });
      const busy = bks.some(
        (b) =>
          b.status === 'confirmed' ||
          b.status === 'completed' ||
          isLivePending(b.status, b.expiresAt),
      );
      if (!busy) free += 1;
    }
    return free;
  }

  private withImage(lane: Lane) {
    const key = lane.imageKey || `lane-${lane.number}`;
    return {
      ...lane,
      imageKey: key,
      imageUrl: `/assets/lanes/${key}.jpg`,
    };
  }

  private async withAvailability(lane: Lane, today = madridDate()) {
    const freeSlotsToday = await this.freeSlotsFor(lane.id, today);
    return {
      ...this.withImage(lane),
      freeSlotsToday,
      maintenance: false,
    };
  }

  async findAll(q?: { availableToday?: string; q?: string; page?: number }) {
    const page = Math.max(1, Number(q?.page) || 1);
    const take = 50;
    const skip = (page - 1) * take;
    const qb = this.lanes.createQueryBuilder('l').where('l.active = :a', { a: true });
    if (q?.q) {
      qb.andWhere('(l.name LIKE :q OR l.description LIKE :q)', { q: `%${q.q}%` });
    }
    qb.orderBy('l.number', 'ASC').skip(skip).take(take);
    const [items, total] = await qb.getManyAndCount();
    const today = madridDate();

    const enriched = [];
    for (const lane of items) {
      enriched.push(await this.withAvailability(lane, today));
    }

    let filtered = enriched;
    if (q?.availableToday === '1' || q?.availableToday === 'true') {
      filtered = enriched.filter((l) => (l.freeSlotsToday ?? 0) > 0);
    }

    return {
      items: filtered,
      total: q?.availableToday ? filtered.length : total,
    };
  }

  async featured() {
    const items = await this.lanes.find({
      where: { active: true },
      order: { number: 'ASC' },
      take: 4,
    });
    const today = madridDate();
    const out = [];
    for (const lane of items) {
      out.push(await this.withAvailability(lane, today));
    }
    return { items: out };
  }

  async findOne(id: number) {
    const lane = await this.lanes.findOne({ where: { id } });
    if (!lane) throw new NotFoundException('Pista no encontrada');
    const revs = await this.reviews.find({ where: { laneId: id } });
    const ratingCount = revs.length;
    const ratingAvg =
      ratingCount === 0
        ? 0
        : Math.round((revs.reduce((a, r) => a + r.rating, 0) / ratingCount) * 10) / 10;
    const today = madridDate();
    const freeSlotsToday = await this.freeSlotsFor(id, today);
    return {
      lane: {
        ...this.withImage(lane),
        freeSlotsToday,
        ratingAvg,
        ratingCount,
        maintenance: false,
      },
      ratingAvg,
      ratingCount,
    };
  }

  async create(dto: CreateLaneDto) {
    const exists = await this.lanes.findOne({ where: { number: dto.number } });
    if (exists) throw new ConflictException('Número de pista ya existe');
    const lane = (await this.lanes.save({
      number: dto.number,
      name: dto.name,
      description: dto.description || '',
      maxPlayers: dto.maxPlayers ?? 6,
      basePriceCents: dto.basePriceCents,
      shoePriceCents: dto.shoePriceCents ?? 200,
      active: true,
      imageKey: dto.imageKey ?? null,
    } as any)) as Lane;
    return { lane: this.withImage(lane) };
  }

  async update(id: number, dto: UpdateLaneDto) {
    const lane = await this.lanes.findOne({ where: { id } });
    if (!lane) throw new NotFoundException('Pista no encontrada');
    if (dto.name !== undefined) lane.name = dto.name;
    if (dto.description !== undefined) lane.description = dto.description;
    if (dto.maxPlayers !== undefined) lane.maxPlayers = dto.maxPlayers;
    if (dto.basePriceCents !== undefined) lane.basePriceCents = dto.basePriceCents;
    if (dto.shoePriceCents !== undefined) lane.shoePriceCents = dto.shoePriceCents;
    if (dto.active !== undefined) lane.active = dto.active;
    if (dto.imageKey !== undefined) lane.imageKey = dto.imageKey;
    await this.lanes.save(lane);
    return { lane: this.withImage(lane) };
  }

  async softDelete(id: number) {
    const lane = await this.lanes.findOne({ where: { id } });
    if (!lane) throw new NotFoundException('Pista no encontrada');
    lane.active = false;
    await this.lanes.save(lane);
    return { ok: true };
  }
}
