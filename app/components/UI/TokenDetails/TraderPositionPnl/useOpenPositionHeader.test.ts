import { EthAccountType, SolAccountType } from '@metamask/keyring-api';
import type { CaipAssetType } from '@metamask/utils';
import { renderHook } from '@testing-library/react-native';
import { createMockInternalAccount } from '../../../../util/test/accountsControllerTestUtils';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { useTokenCaipAssetId } from '../hooks/useTokenCaipAssetId';
import { useSessionProfileId } from '../../../../util/notifications/hooks/useSessionProfileId';
import { useOpenPositionForAsset } from './useOpenPositionForAsset';
import { useOpenPositionHeader } from './useOpenPositionHeader';
import { useUsdToFiatRate } from './useUsdToFiatRate';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));

jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: jest.fn(),
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));

jest.mock('../hooks/useTokenCaipAssetId', () => ({
  useTokenCaipAssetId: jest.fn(),
}));

jest.mock('../hooks/useTokenBalance', () => ({
  useTokenBalance: jest.fn(),
}));

jest.mock('./useOpenPositionForAsset', () => ({
  useOpenPositionForAsset: jest.fn(),
}));

jest.mock('./useUsdToFiatRate', () => ({
  useUsdToFiatRate: jest.fn(),
}));

jest.mock('../../../../util/notifications/hooks/useSessionProfileId', () => ({
  useSessionProfileId: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectByScope =
  selectSelectedInternalAccountByScope as unknown as jest.Mock;
const mockUseTokenCaipAssetId = useTokenCaipAssetId as jest.MockedFunction<
  typeof useTokenCaipAssetId
>;
const mockUseTokenBalance = useTokenBalance as jest.MockedFunction<
  typeof useTokenBalance
>;
const mockUseOpenPositionForAsset =
  useOpenPositionForAsset as jest.MockedFunction<
    typeof useOpenPositionForAsset
  >;
const mockUseUsdToFiatRate = useUsdToFiatRate as jest.MockedFunction<
  typeof useUsdToFiatRate
>;
const mockUseSessionProfileId = useSessionProfileId as jest.MockedFunction<
  typeof useSessionProfileId
>;

const EVM_ADDRESS = '0x1234567890AbcdEF1234567890aBcdef12345678';
const SOLANA_ADDRESS = 'FhRg7Nt3EJ6xKXaLm2pQvYwZ9cD4bS1uT8nJkV5hXqGe';
const SOLANA_SCOPE = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

const USDC_MAINNET =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;
const SOLANA_TOKEN = `${SOLANA_SCOPE}/token:Es9vMFrzaCER` as CaipAssetType;

const evmAccount = createMockInternalAccount(
  EVM_ADDRESS,
  'EVM',
  undefined,
  EthAccountType.Eoa,
);

const solanaAccount = createMockInternalAccount(
  SOLANA_ADDRESS,
  'Solana',
  undefined,
  SolAccountType.DataAccount,
);

const token = { address: '0xabc', chainId: '0x1' } as TokenDetailsRouteParams;

/** Runs whatever inline selector the hook passes to `useSelector`. */
const runSelectors = () => {
  mockUseSelector.mockImplementation((selector) => selector({} as never));
};

/** The address the hook handed to the open-position query. */
const requestedAddress = () => mockUseOpenPositionForAsset.mock.calls[0][0];

describe('useOpenPositionHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    runSelectors();
    mockSelectByScope.mockReturnValue(() => undefined);
    (selectSelectedInternalAccount as unknown as jest.Mock).mockReturnValue(
      evmAccount,
    );
    mockUseTokenCaipAssetId.mockReturnValue(USDC_MAINNET);
    mockUseTokenBalance.mockReturnValue({
      balance: '10',
      fiatBalance: '$90.00',
      tokenFormattedBalance: '10 PEPE',
    } as ReturnType<typeof useTokenBalance>);
    mockUseOpenPositionForAsset.mockReturnValue({
      position: null,
      sharePosition: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUseUsdToFiatRate.mockReturnValue({ currency: 'USD', rate: 1 });
    mockUseSessionProfileId.mockReturnValue({
      profileId: undefined,
      isLoading: false,
    });
  });

  it('queries the selected group account on the asset chain', () => {
    mockUseTokenCaipAssetId.mockReturnValue(SOLANA_TOKEN);
    mockSelectByScope.mockReturnValue((scope: string) =>
      scope === SOLANA_SCOPE ? solanaAccount : undefined,
    );

    renderHook(() => useOpenPositionHeader(token));

    expect(requestedAddress()).toBe(SOLANA_ADDRESS);
    expect(mockUseOpenPositionForAsset).toHaveBeenCalledWith(
      SOLANA_ADDRESS,
      'Es9vMFrzaCER',
      SOLANA_ADDRESS,
    );
  });

  it('queries the signed-in profile id instead of the wallet', () => {
    mockUseSessionProfileId.mockReturnValue({
      profileId: 'bbda626e-5ef2-4652-8d07-4589318872e5',
      isLoading: false,
    });

    renderHook(() => useOpenPositionHeader(token));

    expect(mockUseOpenPositionForAsset).toHaveBeenCalledWith(
      'bbda626e-5ef2-4652-8d07-4589318872e5',
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      EVM_ADDRESS,
    );
  });

  it('waits for the session profile id before querying the wallet', () => {
    mockUseSessionProfileId.mockReturnValue({
      profileId: undefined,
      isLoading: true,
    });

    renderHook(() => useOpenPositionHeader(token));

    expect(requestedAddress()).toBeUndefined();
  });

  it('does not query an EVM wallet for a Solana asset', () => {
    mockUseTokenCaipAssetId.mockReturnValue(SOLANA_TOKEN);

    renderHook(() => useOpenPositionHeader(token));

    expect(requestedAddress()).toBeUndefined();
  });

  it('falls back to the selected account when it covers the asset chain', () => {
    renderHook(() => useOpenPositionHeader(token));

    expect(requestedAddress()).toBe(EVM_ADDRESS);
  });

  it('passes no asset id when the token has no CAIP-19 id', () => {
    mockUseTokenCaipAssetId.mockReturnValue(null);

    renderHook(() => useOpenPositionHeader(token));

    expect(mockUseOpenPositionForAsset).toHaveBeenCalledWith(
      undefined,
      undefined,
      undefined,
    );
  });

  it('shows the wallet balance when there is no position', () => {
    const { result } = renderHook(() => useOpenPositionHeader(token));

    expect(result.current).toEqual({
      positionValue: '$90.00',
      isLoading: false,
      sharePosition: null,
    });
  });

  it('shows the position value and PnL for a ready position', () => {
    mockUseOpenPositionForAsset.mockReturnValue({
      position: {
        positionAmount: 1,
        isOpen: true,
        boughtUsd: 100,
        soldUsd: 0,
        realizedPnl: 0,
        costBasis: 100,
        currentValueUSD: 150,
        pnlValueUsd: 50,
        pnlPercent: null,
        pnlStatus: 'ready',
      },
      sharePosition: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useOpenPositionHeader(token));

    expect(result.current.positionValue).toBe('$90.00');
    expect(result.current.pnl).toEqual(
      expect.objectContaining({ amount: '+$50.00', isProfit: true }),
    );
  });
});
