import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItem } from '../entities/entities';
import { CreateMenuItemDto, UpdateMenuItemDto } from './menu.dto';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuItem) private readonly menu: Repository<MenuItem>,
  ) {}

  async list() {
    const items = await this.menu.find({
      where: { active: true },
      order: { id: 'ASC' },
    });
    return { items };
  }

  async create(dto: CreateMenuItemDto) {
    const item = (await this.menu.save({
      name: dto.name,
      description: dto.description || '',
      priceCents: dto.priceCents,
      active: true,
    } as any)) as MenuItem;
    return { item };
  }

  async update(id: number, dto: UpdateMenuItemDto) {
    const item = await this.menu.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Item no encontrado');
    if (dto.name !== undefined) item.name = dto.name;
    if (dto.description !== undefined) item.description = dto.description;
    if (dto.priceCents !== undefined) item.priceCents = dto.priceCents;
    if (dto.active !== undefined) item.active = dto.active;
    await this.menu.save(item);
    return { item };
  }
}
