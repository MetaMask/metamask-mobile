import { CardType } from '../types';
import {
  resolveCardArrivalDecision,
  type CardArrivalConditions,
} from './cardArrival';

const buildConditions = (
  overrides: Partial<CardArrivalConditions> = {},
): CardArrivalConditions => ({
  flagEnabled: true,
  alreadySeen: false,
  fromCardOnboarding: true,
  cardType: CardType.VIRTUAL,
  reduceMotion: false,
  ...overrides,
});

const INELIGIBLE_CONDITIONS: [string, Partial<CardArrivalConditions>][] = [
  ['the feature flag is off', { flagEnabled: false }],
  ['the one-shot has already been consumed', { alreadySeen: true }],
  [
    'the dashboard was not reached from card onboarding',
    { fromCardOnboarding: false },
  ],
];

describe('resolveCardArrivalDecision', () => {
  it('returns animate for a virtual card reached from onboarding with reduce motion off', () => {
    const conditions = buildConditions();

    const result = resolveCardArrivalDecision(conditions);

    expect(result).toBe('animate');
  });

  it.each(INELIGIBLE_CONDITIONS)(
    'returns skip when %s',
    (_description, overrides) => {
      const conditions = buildConditions(overrides);

      const result = resolveCardArrivalDecision(conditions);

      expect(result).toBe('skip');
    },
  );

  it.each(INELIGIBLE_CONDITIONS)(
    'returns skip rather than pending when %s and both asynchronous inputs are unresolved, so the dashboard never withholds its first paint',
    (_description, overrides) => {
      const conditions = buildConditions({
        ...overrides,
        cardType: undefined,
        reduceMotion: null,
      });

      const result = resolveCardArrivalDecision(conditions);

      expect(result).toBe('skip');
    },
  );

  it('returns pending while the card type is still loading', () => {
    const conditions = buildConditions({ cardType: undefined });

    const result = resolveCardArrivalDecision(conditions);

    expect(result).toBe('pending');
  });

  it('returns pending while the reduce motion lookup is unresolved', () => {
    const conditions = buildConditions({ reduceMotion: null });

    const result = resolveCardArrivalDecision(conditions);

    expect(result).toBe('pending');
  });

  it('returns skip for a non-virtual card without awaiting the reduce motion lookup', () => {
    const conditions = buildConditions({
      cardType: CardType.PHYSICAL,
      reduceMotion: null,
    });

    const result = resolveCardArrivalDecision(conditions);

    expect(result).toBe('skip');
  });

  it.each([CardType.PHYSICAL, CardType.METAL])(
    'returns skip for a %s card',
    (cardType) => {
      const conditions = buildConditions({ cardType });

      const result = resolveCardArrivalDecision(conditions);

      expect(result).toBe('skip');
    },
  );

  it('returns skip for a virtual card when reduce motion is enabled', () => {
    const conditions = buildConditions({ reduceMotion: true });

    const result = resolveCardArrivalDecision(conditions);

    expect(result).toBe('skip');
  });
});
