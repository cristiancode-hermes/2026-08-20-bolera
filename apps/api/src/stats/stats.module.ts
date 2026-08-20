import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking, Lane, LaneSlot } from '../entities/entities';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, LaneSlot, Lane]), AuthModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
