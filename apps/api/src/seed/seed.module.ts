import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Booking,
  BookingLine,
  EmailLog,
  Favorite,
  Lane,
  LaneSlot,
  MenuItem,
  Review,
  User,
} from '../entities/entities';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Lane,
      LaneSlot,
      Booking,
      BookingLine,
      MenuItem,
      Review,
      EmailLog,
      Favorite,
    ]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
