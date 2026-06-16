import type { WalletState } from '@metamask/client-mcp-core';
import type { Fixture } from '../../../tests/framework/fixtures/types';
import {
  fixtureToWalletState,
  walletStateToFixture,
} from '../capabilities/fixture-adapter';

jest.mock('@metamask/client-mcp-core', () => ({}));

const VALID_STATE_DATA: Record<string, unknown> = {
  engine: { backgroundState: {} },
  browser: { activeTab: null, tabs: [] },
  user: { passwordSet: true },
  fiatOrders: { orders: [] },
  legalNotices: { newPrivacyPolicyToastShownDate: 0 },
};

describe('fixtureToWalletState', () => {
  it('returns data unchanged and parses version from asyncState', () => {
    const fixture = {
      state: { engine: {}, browser: {} },
      asyncState: { version: '5' },
    } as unknown as Fixture;

    const result = fixtureToWalletState(fixture);

    expect(result.data).toBe(fixture.state);
    expect(result.meta).toEqual({ version: 5 });
  });

  it('omits meta when asyncState has no version', () => {
    const fixture = {
      state: { engine: {} },
      asyncState: {},
    } as unknown as Fixture;

    const result = fixtureToWalletState(fixture);

    expect(result.data).toBe(fixture.state);
    expect(result).not.toHaveProperty('meta');
  });

  it('omits meta when version is not a finite number (alphabetic)', () => {
    const fixture = {
      state: {},
      asyncState: { version: 'abc' },
    } as unknown as Fixture;

    const result = fixtureToWalletState(fixture);

    expect(result).not.toHaveProperty('meta');
  });

  it('parses empty string version as 0 (Number("") === 0)', () => {
    const fixture = {
      state: {},
      asyncState: { version: '' },
    } as unknown as Fixture;

    const result = fixtureToWalletState(fixture);

    expect(result.meta).toEqual({ version: 0 });
  });

  it('drops extra asyncState keys — only version is used', () => {
    const fixture = {
      state: {},
      asyncState: { version: '10', extra: 'ignored', another: 'dropped' },
    } as unknown as Fixture;

    const result = fixtureToWalletState(fixture);

    expect(result.meta).toEqual({ version: 10 });
    expect(result).not.toHaveProperty('extra');
    expect(result).not.toHaveProperty('another');
  });
});

describe('walletStateToFixture', () => {
  it('converts valid WalletState with meta.version to Fixture', () => {
    const state: WalletState = {
      data: { ...VALID_STATE_DATA },
      meta: { version: 1 },
    };

    const result = walletStateToFixture(state);

    expect(result.state).toBe(state.data);
    expect(result.asyncState).toEqual({ version: '1' });
  });

  it('returns empty asyncState when meta is undefined', () => {
    const state: WalletState = { data: { ...VALID_STATE_DATA } };

    const result = walletStateToFixture(state);

    expect(result.asyncState).toEqual({});
  });

  it('includes asyncState.version when meta.version is 0', () => {
    const state: WalletState = {
      data: { ...VALID_STATE_DATA },
      meta: { version: 0 },
    };

    const result = walletStateToFixture(state);

    expect(result.asyncState).toEqual({ version: '0' });
  });

  describe('throws when required key is missing', () => {
    const requiredKeys = [
      'engine',
      'browser',
      'user',
      'fiatOrders',
      'legalNotices',
    ];

    for (const key of requiredKeys) {
      it(`throws for missing "${key}"`, () => {
        const data = { ...VALID_STATE_DATA };
        delete data[key];

        expect(() => walletStateToFixture({ data })).toThrow(
          `Invalid WalletState: missing or malformed required FixtureState key "${key}".`,
        );
      });
    }
  });

  it('throws when required key is null', () => {
    const data = { ...VALID_STATE_DATA, engine: null };

    expect(() => walletStateToFixture({ data })).toThrow(
      'Invalid WalletState: missing or malformed required FixtureState key "engine".',
    );
  });

  it('throws when required key is a primitive', () => {
    const data = { ...VALID_STATE_DATA, engine: 'string' };

    expect(() => walletStateToFixture({ data })).toThrow(
      'Invalid WalletState: missing or malformed required FixtureState key "engine".',
    );
  });
});

describe('round-trip', () => {
  it('walletStateToFixture(fixtureToWalletState(fixture)) equals the input', () => {
    const fixture: Fixture = {
      state: VALID_STATE_DATA as Fixture['state'],
      asyncState: { version: '42' },
    };

    const walletState = fixtureToWalletState(fixture);
    const roundTripped = walletStateToFixture(walletState);

    expect(roundTripped).toEqual(fixture);
  });

  it('round-trip works when asyncState has no version', () => {
    const fixture: Fixture = {
      state: VALID_STATE_DATA as Fixture['state'],
      asyncState: {},
    };

    const walletState = fixtureToWalletState(fixture);
    const roundTripped = walletStateToFixture(walletState);

    expect(roundTripped.state).toBe(fixture.state);
    expect(roundTripped.asyncState).toEqual({});
  });
});
