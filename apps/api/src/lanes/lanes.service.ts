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

    let filtered = items;
    if (q?.availableToday === '1' || q?.availableToday === 'true') {
      const today = madridDate();
      const free: Lane[] = [];
      for (const lane of items) {
        const slots = await this.slots.find({ where: { laneId: lane.id, date: today, blocked: false } });
        let hasFree = false;
        for (const s of slots) {
          const bks = await this.bookings.find({ where: { slotId: s.id } });
          const busy = bks.some(
            (b) =>
              b.status === 'confirmed' ||
              b.status === 'completed' ||
              isLivePending(b.status, b.expiresAt),
          );
          if (!busy) {
            hasFree = true;
            break;
          }
        }
        if (hasFree) free.push(lane);
      }
      filtered = free;
    }

    return { items: filtered, total: q?.availableToday ? filtered.length : total };
  }

  async featured() {
    const items = await this.lanes.find({
      where: { active: true },
      order: { number: 'ASC' },
      take: 4,
    });
    return { items };
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
    return { lane, ratingAvg, ratingCount };
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
    return { lane };
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
    return { lane };
  }

  async softDelete(id: number) {
    const lane = await this.lanes.findOne({ where: { id } });
    if (!lane) throw new NotFoundException('Pista no encontrada');
    lane.active = false;
    await this.lanes.save(lane);
    return { ok: true };
  }
}
