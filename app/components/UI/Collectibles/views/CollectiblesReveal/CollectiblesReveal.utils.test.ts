import { createCard, createOperation, createPack } from '../testUtils';
import {
  getRevealState,
  getStartOverPack,
  shouldDismissOnClose,
} from './CollectiblesReveal.utils';

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
    ['submitted', 'paying'],
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
        operation: createOperation({
          status: 'opened',
          mint: CARD.mint,
          result: CARD,
        }),
        card: CARD,
        isCompleting: false,
      }),
    ).toStrictEqual({ kind: 'revealed', card: CARD });
  });

  it('keeps processing while the opened operation has no awarded card yet', () => {
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
          status: 'submitted',
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

describe('CollectiblesReveal.utils', () => {
  it('returns the current catalogue entry of the operation pack', () => {
    const repriced = createPack({ code: 'pokemon_50', price: 55 });
    const other = createPack({ code: 'one_piece_25', price: 25 });

    const pack = getStartOverPack(
      [other, repriced],
      createOperation({ packCode: 'pokemon_50', price: 50 }),
    );

    expect(pack).toBe(repriced);
  });

  it('returns no pack when the catalogue no longer lists it or without operation', () => {
    const other = createPack({ code: 'one_piece_25' });

    expect(
      getStartOverPack([other], createOperation({ packCode: 'pokemon_50' })),
    ).toBeUndefined();
    expect(getStartOverPack([other], undefined)).toBeUndefined();
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
    expect(shouldDismissOnClose(createOperation({ status: 'submitted' }))).toBe(
      false,
    );
  });
});
