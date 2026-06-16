import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { usePayWithNoFeeToken } from './usePayWithNoFeeToken';
import { selectMoneyNoFeeTokens } from '../../../../UI/Money/selectors/featureFlags';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { AssetType } from '../../types/token';
import { Hex } from '@metamask/utils';
import { WildcardTokenList } from '../../../../UI/Earn/utils/wildcardTokenList';

jest.mock('../../../../UI/Money/selectors/featureFlags');
jest.mock('./useTransactionPayAvailableTokens');

const STATE_MOCK = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {},
      },
    },
  },
};

describe('usePayWithNoFeeToken', () => {
  const selectMoneyNoFeeTokensMock = jest.mocked(selectMoneyNoFeeTokens);
  const useTransactionPayAvailableTokensMock = jest.mocked(
    useTransactionPayAvailableTokens,
  );

  const createMockToken = (
    address: string,
    symbol: string,
    chainId: string,
    fiatBalance: number,
    disabled = false,
  ): AssetType =>
    ({
      address: address as Hex,
      chainId: chainId as Hex,
      symbol,
      fiat: { balance: fiatBalance },
      disabled,
      balance: `${fiatBalance}`,
      decimals: 6,
      image: '',
      isETH: false,
      logo: undefined,
      name: symbol,
    }) as AssetType;

  beforeEach(() => {
    jest.resetAllMocks();

    selectMoneyNoFeeTokensMock.mockReturnValue({} as WildcardTokenList);
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [],
      hasTokens: false,
    });
  });

  it('returns undefined noFeeToken when no tokens are available', () => {
    selectMoneyNoFeeTokensMock.mockReturnValue({
      '*': ['USDC', 'USDT'],
    } as WildcardTokenList);

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.noFeeToken).toBeUndefined();
  });

  it('returns undefined noFeeToken when no tokens match no-fee list', () => {
    const tokens = [
      createMockToken('0x123', 'DAI', '0x1', 100),
      createMockToken('0x456', 'POL', '0x1', 200),
    ];

    selectMoneyNoFeeTokensMock.mockReturnValue({
      '*': ['USDC', 'USDT'],
    } as WildcardTokenList);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.noFeeToken).toBeUndefined();
  });

  it('returns highest balance no-fee token', () => {
    const tokens = [
      createMockToken('0x123', 'USDC', '0x1', 100),
      createMockToken('0x456', 'USDT', '0x1', 200),
      createMockToken('0x789', 'DAI', '0x1', 300),
    ];

    selectMoneyNoFeeTokensMock.mockReturnValue({
      '*': ['USDC', 'USDT'],
    } as WildcardTokenList);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.noFeeToken).toEqual({
      address: '0x456',
      balanceUsd: '200',
      chainId: '0x1',
      symbol: 'USDT',
    });
  });

  it('excludes the specified token from results', () => {
    const tokens = [
      createMockToken('0x123', 'USDC', '0x1', 100),
      createMockToken('0x456', 'USDT', '0x1', 200),
    ];

    selectMoneyNoFeeTokensMock.mockReturnValue({
      '*': ['USDC', 'USDT'],
    } as WildcardTokenList);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(
      () =>
        usePayWithNoFeeToken({
          excludeToken: { address: '0x456', chainId: '0x1' },
        }),
      {
        state: STATE_MOCK,
      },
    );

    expect(result.current.noFeeToken).toEqual({
      address: '0x123',
      balanceUsd: '100',
      chainId: '0x1',
      symbol: 'USDC',
    });
  });

  it('returns undefined when only available no-fee token is excluded', () => {
    const tokens = [
      createMockToken('0x123', 'USDC', '0x1', 100),
      createMockToken('0x456', 'DAI', '0x1', 200),
    ];

    selectMoneyNoFeeTokensMock.mockReturnValue({
      '*': ['USDC'],
    } as WildcardTokenList);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(
      () =>
        usePayWithNoFeeToken({
          excludeToken: { address: '0x123', chainId: '0x1' },
        }),
      {
        state: STATE_MOCK,
      },
    );

    expect(result.current.noFeeToken).toBeUndefined();
  });

  it('skips disabled tokens', () => {
    const tokens = [
      createMockToken('0x123', 'USDC', '0x1', 100, true),
      createMockToken('0x456', 'USDT', '0x1', 200),
    ];

    selectMoneyNoFeeTokensMock.mockReturnValue({
      '*': ['USDC', 'USDT'],
    } as WildcardTokenList);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.noFeeToken).toEqual({
      address: '0x456',
      balanceUsd: '200',
      chainId: '0x1',
      symbol: 'USDT',
    });
  });

  it('isNoFeeToken returns true for matching token', () => {
    const tokens = [createMockToken('0x123', 'USDC', '0x1', 100)];

    selectMoneyNoFeeTokensMock.mockReturnValue({
      '*': ['USDC'],
    } as WildcardTokenList);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.isNoFeeToken('0x123', '0x1')).toBe(true);
  });

  it('isNoFeeToken returns false for non-matching token', () => {
    const tokens = [createMockToken('0x123', 'USDC', '0x1', 100)];

    selectMoneyNoFeeTokensMock.mockReturnValue({
      '*': ['USDT'],
    } as WildcardTokenList);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.isNoFeeToken('0x123', '0x1')).toBe(false);
  });

  it('handles chain-specific no-fee token lists', () => {
    const tokens = [
      createMockToken('0x123', 'USDC', '0x1', 100),
      createMockToken('0x456', 'USDC', '0x89', 200),
    ];

    selectMoneyNoFeeTokensMock.mockReturnValue({
      '0x1': ['USDC'],
    } as WildcardTokenList);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.noFeeToken).toEqual({
      address: '0x123',
      balanceUsd: '100',
      chainId: '0x1',
      symbol: 'USDC',
    });
  });

  it('handles case-insensitive address and chainId matching', () => {
    const tokens = [createMockToken('0xABC', 'USDC', '0x1', 100)];

    selectMoneyNoFeeTokensMock.mockReturnValue({
      '*': ['USDC'],
    } as WildcardTokenList);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.isNoFeeToken('0xabc', '0x1')).toBe(true);
  });

  it('handles case-insensitive excludeToken matching', () => {
    const tokens = [
      createMockToken('0xABC', 'USDC', '0x1', 100),
      createMockToken('0xDEF', 'USDT', '0x1', 50),
    ];

    selectMoneyNoFeeTokensMock.mockReturnValue({
      '*': ['USDC', 'USDT'],
    } as WildcardTokenList);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(
      () =>
        usePayWithNoFeeToken({
          excludeToken: { address: '0xabc', chainId: '0x1' },
        }),
      {
        state: STATE_MOCK,
      },
    );

    expect(result.current.noFeeToken).toEqual({
      address: '0xDEF',
      balanceUsd: '50',
      chainId: '0x1',
      symbol: 'USDT',
    });
  });

  it('returns undefined when token has no chainId', () => {
    const tokens = [
      {
        address: '0x123' as Hex,
        symbol: 'USDC',
        fiat: { balance: 100 },
        disabled: false,
      } as AssetType,
    ];

    selectMoneyNoFeeTokensMock.mockReturnValue({
      '*': ['USDC'],
    } as WildcardTokenList);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.noFeeToken).toBeUndefined();
  });

  it('isNoFeeToken returns false when token has no chainId', () => {
    const tokens = [
      {
        address: '0x123' as Hex,
        symbol: 'USDC',
        fiat: { balance: 100 },
        disabled: false,
      } as AssetType,
    ];

    selectMoneyNoFeeTokensMock.mockReturnValue({
      '*': ['USDC'],
    } as WildcardTokenList);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.isNoFeeToken('0x123', '0x1')).toBe(false);
  });

  it('handles tokens with zero fiat balance', () => {
    const tokens = [
      createMockToken('0x123', 'USDC', '0x1', 0),
      createMockToken('0x456', 'USDT', '0x1', 100),
    ];

    selectMoneyNoFeeTokensMock.mockReturnValue({
      '*': ['USDC', 'USDT'],
    } as WildcardTokenList);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.noFeeToken).toEqual({
      address: '0x456',
      balanceUsd: '100',
      chainId: '0x1',
      symbol: 'USDT',
    });
  });
});
