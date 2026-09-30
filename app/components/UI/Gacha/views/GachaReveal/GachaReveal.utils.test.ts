import { createCard, createOperation } from '../testUtils';
import {
  canAffordAnotherPack,
  getRevealState,
  shouldDismissOnClose,
} from './GachaReveal.utils';

const CARD = createCard();

describe('getRevealState', () => {
  it('returns not found without operation', () => {
    expect(
      getRevealState({
        operation: undefined,
        card: undefined,
        isCompleting: false,
      }),
    ).toStrictEqual({
      kind: 'error',
      error: { code: 'NOT_FOUND' },
      canRetry: false,
      canStartOver: false,
    });
  });

  it.each([
    ['generated', 'signing'],
    ['signed', 'paying'],
    ['submitted', 'opening'],
    ['paid', 'opening'],
  ] as const)('maps %s to the %s stage', (status, stage) => {
    expect(
      getRevealState({
        operation: createOperation({ status }),
        card: undefined,
        isCompleting: true,
      }),
    ).toStrictEqual({ kind: 'processing', stage });
  });

  it('reveals the card of an opened operation', () => {
    expect(
      getRevealState({
        operation: createOperation({ status: 'opened', mint: CARD.mint }),
        card: CARD,
        isCompleting: false,
      }),
    ).toStrictEqual({ kind: 'revealed', card: CARD });
  });

  it('keeps processing while an opened card is not stored yet', () => {
    expect(
      getRevealState({
        operation: createOperation({ status: 'opened' }),
        card: undefined,
        isCompleting: true,
      }),
    ).toStrictEqual({ kind: 'processing', stage: 'opening' });
  });

  it('offers Start over on an expired pack', () => {
    expect(
      getRevealState({
        operation: createOperation({ status: 'expired' }),
        card: undefined,
        isCompleting: false,
      }),
    ).toStrictEqual({
      kind: 'error',
      error: { code: 'PACK_EXPIRED' },
      canRetry: false,
      canStartOver: true,
    });
  });

  it('only offers Close on a failed pack', () => {
    expect(
      getRevealState({
        operation: createOperation({ status: 'failed' }),
        card: undefined,
        isCompleting: false,
      }),
    ).toStrictEqual({
      kind: 'error',
      error: { code: 'PACK_FAILED' },
      canRetry: false,
      canStartOver: false,
    });
  });

  it('offers Try again on a resumable operation with an error', () => {
    expect(
      getRevealState({
        operation: createOperation({
          status: 'signed',
          error: { code: 'SUBMIT_FAILED' },
        }),
        card: undefined,
        isCompleting: false,
      }),
    ).toStrictEqual({
      kind: 'error',
      error: { code: 'SUBMIT_FAILED' },
      canRetry: true,
      canStartOver: false,
    });
  });

  it('uses the local error when the operation has none', () => {
    expect(
      getRevealState({
        operation: createOperation({ status: 'paid' }),
        card: undefined,
        isCompleting: false,
        localError: { code: 'OPEN_PENDING' },
      }),
    ).toMatchObject({ kind: 'error', error: { code: 'OPEN_PENDING' } });
  });

  it('shows processing while a retry runs despite a stored error', () => {
    expect(
      getRevealState({
        operation: createOperation({
          status: 'paid',
          error: { code: 'OPEN_PENDING' },
        }),
        card: undefined,
        isCompleting: true,
      }),
    ).toStrictEqual({ kind: 'processing', stage: 'opening' });
  });
});

describe('GachaReveal.utils', () => {
  it('checks that balance plus refund covers the pack price', () => {
    expect(
      canAffordAnotherPack({
        balance: 8_000_000n,
        refund: '42000000',
        price: 50,
      }),
    ).toBe(true);
    expect(
      canAffordAnotherPack({
        balance: 7_999_999n,
        refund: '42000000',
        price: 50,
      }),
    ).toBe(false);
  });

  it('dismisses terminal or missing operations on close only', () => {
    expect(shouldDismissOnClose(undefined)).toBe(true);
    expect(shouldDismissOnClose(createOperation({ status: 'opened' }))).toBe(
      true,
    );
    expect(shouldDismissOnClose(createOperation({ status: 'expired' }))).toBe(
      true,
    );
    expect(shouldDismissOnClose(createOperation({ status: 'failed' }))).toBe(
      true,
    );
    expect(shouldDismissOnClose(createOperation({ status: 'signed' }))).toBe(
      false,
    );
  });
});
