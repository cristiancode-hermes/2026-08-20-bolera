import {
  TRANSITIONS,
  canTransition,
  hasDuplicateUserSlot,
  pointsForCompleted,
  sumLines,
  canCancelByPolicy,
  validatePartySize,
  buildQrPlaceholderSvg,
  HOLD_MINUTES,
  POINTS_PER_COMPLETED,
  CANCEL_HOURS,
  isLivePending,
  slotIsBusy,
} from './booking-rules';
import { Mutex as RealMutex } from './mutex';

describe('transitions', () => {
  it('pending can go to confirmed/cancelled/expired', () => {
    expect(TRANSITIONS.pending).toEqual(
      expect.arrayContaining(['confirmed', 'cancelled', 'expired']),
    );
  });
  it('confirmed can complete/cancel/no_show', () => {
    expect(canTransition('confirmed', 'completed')).toBe(true);
    expect(canTransition('confirmed', 'no_show')).toBe(true);
  });
  it('completed is terminal', () => {
    expect(TRANSITIONS.completed).toEqual([]);
    expect(canTransition('completed', 'cancelled')).toBe(false);
  });
  it('rejects invalid transition pending→completed', () => {
    expect(canTransition('pending', 'completed')).toBe(false);
  });
});

describe('duplicate user slot', () => {
  it('blocks second pending on same slot', () => {
    expect(
      hasDuplicateUserSlot(
        [{ userId: 1, slotId: 9, status: 'pending' }],
        1,
        9,
      ),
    ).toBe(true);
  });
  it('blocks confirmed on same slot', () => {
    expect(
      hasDuplicateUserSlot(
        [{ userId: 1, slotId: 9, status: 'confirmed' }],
        1,
        9,
      ),
    ).toBe(true);
  });
  it('allows after cancelled/expired', () => {
    expect(
      hasDuplicateUserSlot(
        [
          { userId: 1, slotId: 9, status: 'cancelled' },
          { userId: 1, slotId: 9, status: 'expired' },
        ],
        1,
        9,
      ),
    ).toBe(false);
  });
  it('allows other users', () => {
    expect(
      hasDuplicateUserSlot(
        [{ userId: 2, slotId: 9, status: 'confirmed' }],
        1,
        9,
      ),
    ).toBe(false);
  });
});

describe('points', () => {
  it('points = completed * 15', () => {
    expect(pointsForCompleted(3)).toBe(45);
    expect(POINTS_PER_COMPLETED).toBe(15);
  });
});

describe('totals', () => {
  it('sum lines equals total', () => {
    const lines = [
      { qty: 1, unitPriceCents: 2800 },
      { qty: 4, unitPriceCents: 200 },
      { qty: 2, unitPriceCents: 350 },
    ];
    expect(sumLines(lines)).toBe(2800 + 800 + 700);
  });
});

describe('cancel policy', () => {
  it('blocks under 24h', () => {
    expect(canCancelByPolicy(10)).toBe(false);
    expect(CANCEL_HOURS).toBe(24);
  });
  it('allows at/above 24h', () => {
    expect(canCancelByPolicy(24)).toBe(true);
    expect(canCancelByPolicy(30)).toBe(true);
  });
});

describe('partySize', () => {
  it('valid 1..maxPlayers', () => {
    expect(validatePartySize(1, 6).ok).toBe(true);
    expect(validatePartySize(6, 6).ok).toBe(true);
  });
  it('rejects 0 and over max', () => {
    expect(validatePartySize(0, 6).code).toBe('INVALID_PARTY_SIZE');
    expect(validatePartySize(7, 6).code).toBe('INVALID_PARTY_SIZE');
  });
});

describe('QR', () => {
  it('svg contains code', () => {
    const svg = buildQrPlaceholderSvg('tok123', 'BL-ABC');
    expect(svg).toContain('<svg');
    expect(svg).toContain('BL-ABC');
  });
  it('deterministic for same token', () => {
    expect(buildQrPlaceholderSvg('a', 'C')).toBe(buildQrPlaceholderSvg('a', 'C'));
  });
});

describe('hold constants', () => {
  it('hold is 15 minutes', () => {
    expect(HOLD_MINUTES).toBe(15);
  });
});

describe('pending expiry helpers', () => {
  it('live pending has future expiresAt', () => {
    expect(isLivePending('pending', new Date(Date.now() + 60_000))).toBe(true);
  });
  it('stale pending is not live', () => {
    expect(isLivePending('pending', new Date(Date.now() - 1000))).toBe(false);
  });
  it('slot busy when confirmed', () => {
    expect(slotIsBusy(false, [{ status: 'confirmed', expiresAt: null }])).toBe(
      'busy',
    );
  });
  it('slot blocked flag wins', () => {
    expect(slotIsBusy(true, [])).toBe('blocked');
  });
  it('slot free when only expired pending', () => {
    expect(
      slotIsBusy(false, [
        { status: 'pending', expiresAt: new Date(Date.now() - 5000) },
      ]),
    ).toBe('free');
  });
});

describe('mutex', () => {
  it('serializes concurrent tasks', async () => {
    const m = new RealMutex();
    const order: number[] = [];
    await Promise.all([
      m.run(async () => {
        await new Promise((r) => setTimeout(r, 30));
        order.push(1);
      }),
      m.run(async () => {
        order.push(2);
      }),
    ]);
    expect(order).toEqual([1, 2]);
  });
});
