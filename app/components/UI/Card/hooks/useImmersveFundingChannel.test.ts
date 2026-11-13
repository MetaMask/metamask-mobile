import { renderHook } from '@testing-library/react-native';
import {
  useImmersveFundingChannel,
  useIsImmersveMoneyAccountCountry,
} from './useImmersveFundingChannel';

const moneyChannel = {
  source: 'moneyAccount' as const,
  fundingChannelId: 'money-channel',
};
const walletChannel = {
  source: 'wallet' as const,
  fundingChannelId: 'base-channel',
};

let mockCountryFunding: Record<string, unknown> = {};

jest.mock('react-redux', () => ({
  useSelector: () => mockCountryFunding,
}));

describe('useImmersveFundingChannel', () => {
  beforeEach(() => {
    mockCountryFunding = { NZ: moneyChannel, GB: walletChannel };
  });

  it('returns null when no country is given', () => {
    const { result } = renderHook(() => useImmersveFundingChannel(null));

    expect(result.current).toBeNull();
  });

  it('matches a lowercase country', () => {
    const { result } = renderHook(() => useImmersveFundingChannel('nz'));

    expect(result.current).toEqual(moneyChannel);
  });

  it('returns null for an unknown country', () => {
    const { result } = renderHook(() => useImmersveFundingChannel('FR'));

    expect(result.current).toBeNull();
  });

  it('reports whether the country uses a Money account channel', () => {
    const { result: money } = renderHook(() =>
      useIsImmersveMoneyAccountCountry('NZ'),
    );
    const { result: wallet } = renderHook(() =>
      useIsImmersveMoneyAccountCountry('gb'),
    );

    expect(money.current).toBe(true);
    expect(wallet.current).toBe(false);
  });
});
