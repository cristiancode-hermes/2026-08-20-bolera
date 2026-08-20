import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, Lane, LaneSlot, Review } from '../entities/entities';
import { CreateReviewDto } from './reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(Lane) private readonly lanes: Repository<Lane>,
    @InjectRepository(LaneSlot) private readonly slots: Repository<LaneSlot>,
  ) {}

  async listForLane(laneId: number, page = 1) {
    const take = 20;
    const skip = (Math.max(1, page) - 1) * take;
    const [items, count] = await this.reviews.findAndCount({
      where: { laneId },
      order: { createdAt: 'DESC' },
      skip,
      take,
      relations: { user: true },
    });
    const all = await this.reviews.find({ where: { laneId } });
    const avg =
      all.length === 0
        ? 0
        : Math.round((all.reduce((a, r) => a + r.rating, 0) / all.length) * 10) /
          10;
    return {
      items: items.map((r) => ({
        id: r.id,
        rating: r.rating,
        body: r.body,
        createdAt: r.createdAt,
        user: r.user
          ? { id: r.user.id, username: r.user.username }
          : null,
      })),
      avg,
      count,
    };
  }

  async create(userId: number, laneId: number, dto: CreateReviewDto) {
    const lane = await this.lanes.findOne({ where: { id: laneId } });
    if (!lane) throw new NotFoundException('Pista no encontrada');

    const existing = await this.reviews.findOne({ where: { userId, laneId } });
    if (existing) throw new ConflictException('Ya has reseñado esta pista');

    // Must have completed booking on this lane
    const userBookings = await this.bookings.find({
      where: { userId, status: 'completed' },
      relations: { slot: true },
    });
    const ok = userBookings.some((b) => b.slot?.laneId === laneId);
    if (!ok) {
      throw new ForbiddenException(
        'Solo puedes reseñar pistas con partida completada',
      );
    }

    const review = (await this.reviews.save({
      userId,
      laneId,
      rating: dto.rating,
      body: dto.body || '',
    } as any)) as Review;
    return { review };
  }
}
