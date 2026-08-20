import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, Lane, LaneSlot } from '../entities/entities';
import { isLivePending, slotIsBusy } from '../common/booking-rules';

const DEFAULT_TIMES = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

function endOf(start: string): string {
  const [h, m] = start.split(':').map(Number);
  const endH = (h + 1) % 24;
  return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

@Injectable()
export class SlotsService {
  constructor(
    @InjectRepository(LaneSlot) private readonly slots: Repository<LaneSlot>,
    @InjectRepository(Lane) private readonly lanes: Repository<Lane>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
  ) {}

  async listForLane(laneId: number, date: string) {
    const lane = await this.lanes.findOne({ where: { id: laneId } });
    if (!lane) throw new NotFoundException('Pista no encontrada');
    const rows = await this.slots.find({
      where: { laneId, date },
      order: { startTime: 'ASC' },
    });
    const slots = [];
    for (const s of rows) {
      slots.push(await this.toView(s, lane));
    }
    return { slots };
  }

  async findOne(id: number) {
    const slot = await this.slots.findOne({ where: { id }, relations: { lane: true } });
    if (!slot) throw new NotFoundException('Franja no encontrada');
    const view = await this.toView(slot, slot.lane);
    return { slot: view, lane: slot.lane };
  }

  async generate(laneId: number, date: string, times?: string[]) {
    const lane = await this.lanes.findOne({ where: { id: laneId } });
    if (!lane) throw new NotFoundException('Pista no encontrada');
    const list = times?.length ? times : DEFAULT_TIMES;
    let created = 0;
    for (const startTime of list) {
      const exists = await this.slots.findOne({
        where: { laneId, date, startTime },
      });
      if (exists) continue;
      await this.slots.save({
        laneId,
        date,
        startTime,
        endTime: endOf(startTime),
        blocked: false,
      } as any);
      created += 1;
    }
    return { created };
  }

  async setBlocked(id: number, blocked: boolean) {
    const slot = await this.slots.findOne({ where: { id } });
    if (!slot) throw new NotFoundException('Franja no encontrada');
    slot.blocked = blocked;
    await this.slots.save(slot);
    return { slot };
  }

  private async toView(s: LaneSlot, lane?: Lane) {
    const bks = await this.bookings.find({ where: { slotId: s.id } });
    const status = slotIsBusy(
      s.blocked,
      bks.map((b) => ({ status: b.status, expiresAt: b.expiresAt })),
    );
    return {
      id: s.id,
      laneId: s.laneId,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      blocked: s.blocked,
      status,
      lane: lane
        ? {
            id: lane.id,
            number: lane.number,
            name: lane.name,
            basePriceCents: lane.basePriceCents,
            shoePriceCents: lane.shoePriceCents,
            maxPlayers: lane.maxPlayers,
          }
        : undefined,
    };
  }
}
