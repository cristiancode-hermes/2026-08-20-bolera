import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SlotsService } from './slots.service';
import { BlockSlotDto, GenerateSlotsDto } from './slots.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/current-user';

@ApiTags('slots')
@Controller()
export class SlotsController {
  constructor(private readonly slots: SlotsService) {}

  @Get('lanes/:laneId/slots')
  listForLane(
    @Param('laneId', ParseIntPipe) laneId: number,
    @Query('date') date: string,
  ) {
    return this.slots.listForLane(laneId, date);
  }

  @Get('slots/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.slots.findOne(id);
  }

  @Post('lanes/:laneId/slots/generate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  generate(
    @Param('laneId', ParseIntPipe) laneId: number,
    @Body() dto: GenerateSlotsDto,
  ) {
    return this.slots.generate(laneId, dto.date, dto.times);
  }

  @Patch('slots/:id/block')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  block(@Param('id', ParseIntPipe) id: number, @Body() dto: BlockSlotDto) {
    return this.slots.setBlocked(id, dto.blocked);
  }
}
