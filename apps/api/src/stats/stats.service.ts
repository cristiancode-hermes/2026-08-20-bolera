import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, Lane, LaneSlot } from '../entities/entities';
import { addDaysYmd, isLivePending, madridDate } from '../common/booking-rules';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(LaneSlot) private readonly slots: Repository<LaneSlot>,
    @InjectRepository(Lane) private readonly lanes: Repository<Lane>,
  ) {}

  async overview() {
    const today = madridDate();
    const daySlots = await this.slots.find({ where: { date: today } });
    const openSlots = daySlots.filter((s) => !s.blocked);
    let booked = 0;
    let pending = 0;
    let revenueCents = 0;

    for (const s of openSlots) {
      const bks = await this.bookings.find({ where: { slotId: s.id } });
      for (const b of bks) {
        if (b.status === 'confirmed' || b.status === 'completed') {
          booked += 1;
          revenueCents += b.totalCents;
        } else if (isLivePending(b.status, b.expiresAt)) {
          pending += 1;
        }
      }
    }

    const total = openSlots.length || 1;
    const occupancyPct = Math.round((1000 * booked) / total) / 10;
    const activeLanes = await this.lanes.count({ where: { active: true } });

    return {
      kpis: {
        date: today,
        slotsTotal: openSlots.length,
        booked,
        pending,
        occupancyPct,
        revenueCents,
        activeLanes,
      },
    };
  }

  async revenueSeries(days = 7) {
    const n = Math.min(31, Math.max(1, days));
    const today = madridDate();
    const start = addDaysYmd(today, -(n - 1));
    const points: { date: string; revenueCents: number; bookings: number }[] =
      [];

    for (let i = 0; i < n; i++) {
      const date = addDaysYmd(start, i);
      const daySlots = await this.slots.find({ where: { date } });
      let revenueCents = 0;
      let bookings = 0;
      for (const s of daySlots) {
        const bks = await this.bookings.find({ where: { slotId: s.id } });
        for (const b of bks) {
          if (b.status === 'confirmed' || b.status === 'completed') {
            revenueCents += b.totalCents;
            bookings += 1;
          }
        }
      }
      points.push({ date, revenueCents, bookings });
    }

    return { points };
  }

  async dayBoard(date?: string) {
    const d = date || madridDate();
    const slots = await this.slots.find({
      where: { date: d },
      relations: { lane: true },
      order: { startTime: 'ASC' },
    });
    const rows = [];
    for (const s of slots) {
      const bks = await this.bookings.find({
        where: { slotId: s.id },
        relations: { user: true },
      });
      const active = bks.find(
        (b) =>
          b.status === 'confirmed' ||
          b.status === 'completed' ||
          isLivePending(b.status, b.expiresAt),
      );
      rows.push({
        slotId: s.id,
        laneId: s.laneId,
        laneNumber: s.lane?.number,
        laneName: s.lane?.name,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        blocked: s.blocked,
        status: s.blocked
          ? 'blocked'
          : active
            ? active.status === 'pending'
              ? 'busy'
              : active.status
            : 'free',
        booking: active
          ? {
              id: active.id,
              status: active.status,
              partySize: active.partySize,
              user: active.user
                ? { id: active.user.id, username: active.user.username }
                : null,
            }
          : null,
      });
    }
    return { rows, date: d };
  }
}
