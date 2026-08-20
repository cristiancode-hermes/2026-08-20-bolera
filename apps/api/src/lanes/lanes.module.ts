import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lane, Review, Booking, LaneSlot } from '../entities/entities';
import { LanesService } from './lanes.service';
import { LanesController } from './lanes.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Lane, Review, Booking, LaneSlot]), AuthModule],
  controllers: [LanesController],
  providers: [LanesService],
  exports: [LanesService],
})
export class LanesModule {}
