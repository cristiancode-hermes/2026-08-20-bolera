import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export type UserRole = 'player' | 'staff' | 'admin';
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'no_show';
export type BookingLineKind = 'base' | 'shoe' | 'addon';
export type SlotStatus = 'free' | 'busy' | 'blocked';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 40, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 200 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 16, default: 'player' })
  role: UserRole;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Booking, (b) => b.user)
  bookings?: Booking[];
}

@Entity('lanes')
export class Lane {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  number: number;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 2000, default: '' })
  description: string;

  @Column({ type: 'int', default: 6 })
  maxPlayers: number;

  @Column({ type: 'int' })
  basePriceCents: number;

  @Column({ type: 'int', default: 200 })
  shoePriceCents: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'varchar', length: 120, nullable: true })
  imageKey: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => LaneSlot, (s) => s.lane)
  slots?: LaneSlot[];
}

@Entity('lane_slots')
@Unique(['laneId', 'date', 'startTime'])
export class LaneSlot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  laneId: number;

  @ManyToOne(() => Lane, (l) => l.slots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'laneId' })
  lane?: Lane;

  /** YYYY-MM-DD */
  @Column({ type: 'varchar', length: 10 })
  date: string;

  /** HH:mm */
  @Column({ type: 'varchar', length: 5 })
  startTime: string;

  @Column({ type: 'varchar', length: 5 })
  endTime: string;

  @Column({ type: 'boolean', default: false })
  blocked: boolean;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Booking, (b) => b.slot)
  bookings?: Booking[];
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User, (u) => u.bookings)
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'int' })
  slotId: number;

  @ManyToOne(() => LaneSlot, (s) => s.bookings)
  @JoinColumn({ name: 'slotId' })
  slot?: LaneSlot;

  @Column({ type: 'int' })
  partySize: number;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: BookingStatus;

  @Column({ type: 'int' })
  totalCents: number;

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true, unique: true })
  qrToken: string | null;

  @Column({ type: 'varchar', length: 24, nullable: true })
  code: string | null;

  @Column({ type: 'boolean', default: false })
  bringOwnShoes: boolean;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @OneToMany(() => BookingLine, (l) => l.booking)
  lines?: BookingLine[];
}

@Entity('booking_lines')
export class BookingLine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  bookingId: number;

  @ManyToOne(() => Booking, (b) => b.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking?: Booking;

  @Column({ type: 'varchar', length: 16 })
  kind: BookingLineKind;

  @Column({ type: 'varchar', length: 120 })
  label: string;

  @Column({ type: 'int' })
  qty: number;

  @Column({ type: 'int' })
  unitPriceCents: number;

  @Column({ type: 'int', nullable: true })
  menuItemId: number | null;
}

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  description: string;

  @Column({ type: 'int' })
  priceCents: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}

@Entity('reviews')
@Unique(['userId', 'laneId'])
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'int' })
  laneId: number;

  @ManyToOne(() => Lane)
  @JoinColumn({ name: 'laneId' })
  lane?: Lane;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'varchar', length: 2000, default: '' })
  body: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

@Entity('email_logs')
export class EmailLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'int', nullable: true })
  bookingId: number | null;

  @Column({ type: 'varchar', length: 120 })
  toEmail: string;

  @Column({ type: 'varchar', length: 200 })
  subject: string;

  @Column({ type: 'varchar', length: 4000 })
  body: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

@Entity('favorites')
export class Favorite {
  @PrimaryColumn({ type: 'int' })
  userId: number;

  @PrimaryColumn({ type: 'int' })
  laneId: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

export const ALL_ENTITIES = [
  User,
  Lane,
  LaneSlot,
  Booking,
  BookingLine,
  MenuItem,
  Review,
  EmailLog,
  Favorite,
];
