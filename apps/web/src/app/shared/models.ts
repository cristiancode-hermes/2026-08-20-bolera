export type UserRole = 'player' | 'staff' | 'admin';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'no_show';

export type SlotState = 'free' | 'held' | 'booked' | 'blocked';

export interface User {
  id: string | number;
  username: string;
  email: string;
  name?: string;
  role: UserRole;
  points?: number;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface Lane {
  id: string | number;
  number: number;
  name: string;
  description?: string;
  maxPlayers: number;
  basePriceCents: number;
  active: boolean;
  maintenance?: boolean;
  featured?: boolean;
  freeSlotsToday?: number;
  ratingAvg?: number;
  ratingCount?: number;
  imageKey?: string | null;
  imageUrl?: string | null;
}

export interface LaneDetail {
  lane: Lane;
  ratingAvg?: number;
  ratingCount?: number;
}

export interface SlotView {
  id: string | number;
  laneId?: string | number;
  date: string;
  startTime: string;
  endTime: string;
  status: SlotState | string;
  blocked?: boolean;
  state?: SlotState;
}

export interface MenuItem {
  id: string | number;
  name: string;
  description?: string;
  priceCents: number;
  active?: boolean;
  category?: string;
}

export interface BookingLine {
  id?: string | number;
  type?: string;
  label?: string;
  description?: string;
  qty: number;
  unitPriceCents: number;
  totalCents?: number;
}

export interface Booking {
  id: string | number;
  code?: string;
  status: BookingStatus;
  partySize: number;
  totalCents: number;
  expiresAt?: string | null;
  qrToken?: string;
  qrSvg?: string;
  shoeSizes?: number[];
  bringOwnShoes?: boolean;
  createdAt?: string;
  lane?: Lane;
  slot?: SlotView;
  lines?: BookingLine[];
  laneId?: string | number;
  slotId?: string | number;
  date?: string;
  startTime?: string;
  endTime?: string;
  laneName?: string;
  laneNumber?: number;
}

export interface Review {
  id: string | number;
  rating: number;
  body: string;
  createdAt?: string;
  user?: { username?: string; name?: string };
}

export interface StatsKpis {
  revenueTodayCents?: number;
  revenueCents?: number;
  occupancyPct?: number;
  confirmedToday?: number;
  confirmed?: number;
  noShows?: number;
  pendingHolds?: number;
  bookingsToday?: number;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  revenueCents?: number;
  bookings: number;
}

export interface DayBoardRow {
  id?: string | number;
  slotId?: string | number;
  laneId?: string | number;
  laneName?: string;
  laneNumber?: number;
  startTime: string;
  endTime?: string;
  status?: string;
  blocked?: boolean;
  bookingCode?: string;
  partySize?: number;
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Reservada',
  confirmed: 'Confirmada',
  completed: 'Jugada',
  cancelled: 'Cancelada',
  expired: 'Caducada',
  no_show: 'No presentado',
};
