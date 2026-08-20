import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite, Lane } from '../entities/entities';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite) private readonly favs: Repository<Favorite>,
    @InjectRepository(Lane) private readonly lanes: Repository<Lane>,
  ) {}

  async list(userId: number) {
    const rows = await this.favs.find({ where: { userId } });
    return { laneIds: rows.map((r) => r.laneId) };
  }

  async add(userId: number, laneId: number) {
    const lane = await this.lanes.findOne({ where: { id: laneId } });
    if (!lane) throw new NotFoundException('Pista no encontrada');
    const exists = await this.favs.findOne({ where: { userId, laneId } });
    if (!exists) {
      await this.favs.save({ userId, laneId } as any);
    }
    return { ok: true };
  }

  async remove(userId: number, laneId: number) {
    await this.favs.delete({ userId, laneId });
    return { ok: true };
  }
}
