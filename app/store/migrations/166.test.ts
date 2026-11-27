import migrate, { migrationVersion } from './166';
import { ensureValidState } from './util';

jest.mock('./util', () => ({ ensureValidState: jest.fn() }));

const legacy = {
  hasCompletedOnboarding: true,
  packPartner: {
    cards: { wallet: { mint: { name: 'Pending card' } } },
    operations: {
      wallet: {
        memo: {
          status: 'submitted',
          signature: 'signature',
          signedTransaction: 'bytes',
        },
      },
    },
  },
};
const buildState = (backgroundState: Record<string, unknown>) => ({
  engine: { backgroundState, preserved: true },
  preserved: true,
});

describe('Migration 166: rename Collectibles controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(ensureValidState).mockReturnValue(true);
  });

  it('preserves pending signatures, holdings and unrelated state without mutating the original', () => {
    const state = buildState({
      GachaController: legacy,
      OtherController: { keep: true },
    });
    const before = JSON.stringify(state);

    const migrated = migrate(state);

    expect(migrationVersion).toBe(166);
    expect(ensureValidState).toHaveBeenCalledWith(state, 166);
    expect(migrated).toEqual(
      buildState({
        CollectiblesController: legacy,
        OtherController: { keep: true },
      }),
    );
    expect(JSON.stringify(state)).toBe(before);
  });

  it('is idempotent and never restores legacy data over a cleared current controller', () => {
    const state = buildState({ GachaController: legacy });
    const migrated = migrate(state);
    const cleared = buildState({
      GachaController: legacy,
      CollectiblesController: {},
    });

    expect(migrate(migrated)).toBe(migrated);
    expect(migrate(cleared)).toBe(cleared);
  });

  it.each([undefined, null, 'invalid', [], 42])(
    'ignores malformed legacy state %p',
    (value) => {
      const state = buildState({ GachaController: value });

      expect(migrate(state)).toBe(state);
    },
  );

  it('ignores missing legacy state', () => {
    const state = buildState({ OtherController: {} });

    expect(migrate(state)).toBe(state);
  });

  it('leaves an invalid root untouched', () => {
    jest.mocked(ensureValidState).mockReturnValue(false);
    const state = { invalid: true };

    expect(migrate(state)).toBe(state);
  });
});
