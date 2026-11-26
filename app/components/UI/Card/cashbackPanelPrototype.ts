// PROTOTYPE-DO-NOT-MERGE: whole file. Fake cashback states for the Card home
// prototype. Only active while CARD_HOME_PROTOTYPE_VIEW is set, which is dev
// builds only (see app/selectors/cardController.ts). Nothing here calls an API.
import { useSyncExternalStore } from 'react';
import { CARD_HOME_PROTOTYPE_VIEW } from '../../../selectors/cardController'; // PROTOTYPE-DO-NOT-MERGE

export const CASHBACK_PROTOTYPE = Boolean(CARD_HOME_PROTOTYPE_VIEW); // PROTOTYPE-DO-NOT-MERGE

export type MockCashbackStateName =
  | 'CLAIMABLE'
  | 'CLAIMABLE_LARGE'
  | 'ZERO_FIRST_TIME'
  | 'ZERO_RETURNING'
  | 'BELOW'
  | 'CLAIMABLE_LINEA'
  | 'BLOCKED_MONEY_ACCOUNT'
  | 'BLOCKED_FUNDING';

interface MockCashbackDef {
  balance: number;
  network: 'monad' | 'linea';
  price: string;
  blocked: boolean;
  /** Lifetime cashback already earned before this state (0 = first-time). */
  lifetime: number;
}

export const MOCK_CASHBACK_STATES: Record<
  MockCashbackStateName,
  MockCashbackDef
> = {
  // Cycle order (icon tap): claimable, large, $0 first-time, $0 returning, …
  CLAIMABLE: {
    balance: 10,
    network: 'monad',
    price: '0',
    blocked: false,
    lifetime: 0,
  },
  // Large balance: checks the pill, dialog and toast don't wrap. The mock
  // claims the full balance (the real flow pays whole $5 multiples).
  CLAIMABLE_LARGE: {
    balance: 1000.83,
    network: 'monad',
    price: '0',
    blocked: false,
    lifetime: 0,
  },
  ZERO_FIRST_TIME: {
    balance: 0,
    network: 'monad',
    price: '0',
    blocked: false,
    lifetime: 0,
  },
  ZERO_RETURNING: {
    balance: 0,
    network: 'monad',
    price: '0',
    blocked: false,
    lifetime: 10,
  },
  BELOW: {
    balance: 2.3,
    network: 'monad',
    price: '0',
    blocked: false,
    lifetime: 10,
  },
  CLAIMABLE_LINEA: {
    balance: 10,
    network: 'linea',
    price: '0.01',
    blocked: false,
    lifetime: 0,
  },
  BLOCKED_MONEY_ACCOUNT: {
    balance: 10,
    network: 'monad',
    price: '0',
    blocked: true,
    lifetime: 0,
  },
  BLOCKED_FUNDING: {
    balance: 10,
    network: 'linea',
    price: '0.01',
    blocked: true,
    lifetime: 0,
  },
};

const ORDER = Object.keys(MOCK_CASHBACK_STATES) as MockCashbackStateName[];

interface MockSnapshot {
  name: MockCashbackStateName;
  balance: number;
  blocked: boolean;
  claimedTotal: number;
  /** PROTOTYPE: lifetime cashback from card spend; grows by each claim. */
  lifetimeEarned: number;
  status: 'idle' | 'monitoring' | 'success';
}

let snap: MockSnapshot = {
  name: 'CLAIMABLE',
  balance: MOCK_CASHBACK_STATES.CLAIMABLE.balance,
  blocked: false,
  claimedTotal: 0,
  lifetimeEarned: MOCK_CASHBACK_STATES.CLAIMABLE.lifetime,
  status: 'idle',
};
const listeners = new Set<() => void>();
const emit = (next: Partial<MockSnapshot>) => {
  snap = { ...snap, ...next };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
export const useMockCashback = () =>
  useSyncExternalStore(
    subscribe,
    () => snap,
    () => snap,
  );
export const getMockCashback = () => snap;
export const getMockDef = () => MOCK_CASHBACK_STATES[snap.name];

export const setMockCashbackState = (name: MockCashbackStateName) =>
  emit({
    name,
    balance: MOCK_CASHBACK_STATES[name].balance,
    blocked: MOCK_CASHBACK_STATES[name].blocked,
    lifetimeEarned: MOCK_CASHBACK_STATES[name].lifetime,
    status: 'idle',
  });

export const cycleMockCashbackState = () => {
  const next = ORDER[(ORDER.indexOf(snap.name) + 1) % ORDER.length];
  setMockCashbackState(next);
};

/** Fake claim: nothing is sent. Pending for 2.5s, then success. */
export const mockWithdraw = (amount: string) => {
  emit({ status: 'monitoring' });
  setTimeout(() => {
    const paid = Number(amount);
    // Prototype: a claim empties the panel (drains to $0, no carry-over).
    emit({
      status: 'success',
      balance: 0,
      claimedTotal: snap.claimedTotal + paid,
      lifetimeEarned: Math.round((snap.lifetimeEarned + paid) * 100) / 100,
    });
  }, 2500);
};
export const mockResetWithdraw = () => emit({ status: 'idle' });
export const mockUnblock = () => emit({ blocked: false });
/** Push arrival: the backend paid out $10 while the app was elsewhere. */
export const mockPushPayout = (amount: number) =>
  emit({
    balance: Math.round((snap.balance - amount) * 100) / 100,
    claimedTotal: snap.claimedTotal + amount,
  });
