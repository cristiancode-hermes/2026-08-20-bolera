import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Booking,
  BookingLine,
  EmailLog,
  Lane,
  LaneSlot,
  MenuItem,
  User,
} from '../entities/entities';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingLine,
      LaneSlot,
      Lane,
      User,
      MenuItem,
      EmailLog,
    ]),
    AuthModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
