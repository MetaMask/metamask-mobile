import { renderHook } from '@testing-library/react-native';
import Routes from '../../../../constants/navigation/Routes';
import type { TokenAmount } from '../../../../util/activity-adapters';
import { EARN_EXPERIENCES } from '../../../UI/Earn/constants/experiences';
import useEarnTokens from '../../../UI/Earn/hooks/useEarnTokens';
import type { EarnTokenDetails } from '../../../UI/Earn/types/lending.types';
import { useActivityDetailsLendAgain } from './useActivityDetailsLendAgain';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// `useStablecoinLendingRedirect` is exercised for real (it owns the network
// switch + navigation contract we depend on); only its leaf dependencies are
// stubbed.
jest.mock('react-redux', () => ({ useSelector: jest.fn(() => undefined) }));

const mockFindNetworkClientIdByChainId = jest.fn(
  (_chainId: string) => 'arbitrum-client-id',
);
const mockSetActiveNetwork = jest.fn((_clientId: string) => undefined);
jest.mock('../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: (chainId: string) =>
        mockFindNetworkClientIdByChainId(chainId),
      setActiveNetwork: (clientId: string) => mockSetActiveNetwork(clientId),
    },
  },
}));

const mockTrackEvent = jest.fn();
jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: () => ({
      addProperties: () => ({
        build: () => ({ event: 'earn_button_clicked' }),
      }),
    }),
  }),
}));

jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
  TraceName: { EarnDepositScreen: 'Earn Deposit Screen' },
}));

jest.mock('../../../UI/Earn/hooks/useEarnTokens');
const mockUseEarnTokens = jest.mocked(useEarnTokens);

const ARBITRUM_CAIP_CHAIN_ID = 'eip155:42161';
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const USDC_ASSET_ID = `${ARBITRUM_CAIP_CHAIN_ID}/erc20:${USDC_ADDRESS}`;

const usdcActivityToken = {
  amount: '10000000',
  decimals: 6,
  symbol: 'USDC',
  assetId: USDC_ASSET_ID,
  direction: 'out',
} as TokenAmount;

const makeEarnToken = (experienceType: EARN_EXPERIENCES) =>
  ({
    address: USDC_ADDRESS,
    chainId: '0xa4b1',
    symbol: 'USDC',
    decimals: 6,
    balanceFormatted: '25 USDC',
    experience: { type: experienceType },
    experiences: [{ type: experienceType }],
  }) as unknown as EarnTokenDetails;

const arrangeEarnTokens = (
  earnTokensByChainIdAndAddress: Record<
    string,
    Record<string, EarnTokenDetails>
  >,
) => {
  mockUseEarnTokens.mockReturnValue({
    earnTokensByChainIdAndAddress,
  } as unknown as ReturnType<typeof useEarnTokens>);
};

// The Earn token map is keyed by decimal chain id, not the CAIP/hex form.
const arrangeLendableUsdc = () =>
  arrangeEarnTokens({
    '42161': {
      [USDC_ADDRESS.toLowerCase()]: makeEarnToken(
        EARN_EXPERIENCES.STABLECOIN_LENDING,
      ),
    },
  });

describe('useActivityDetailsLendAgain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindNetworkClientIdByChainId.mockReturnValue('arbitrum-client-id');
    arrangeEarnTokens({});
  });

  it('opens the earn deposit input view with the resolved earn token', async () => {
    arrangeLendableUsdc();

    const { result } = renderHook(() =>
      useActivityDetailsLendAgain({
        token: usdcActivityToken,
        fallbackCaipChainId: ARBITRUM_CAIP_CHAIN_ID,
      }),
    );

    expect(result.current.canLendAgain).toBe(true);

    await result.current.onLendAgain();

    // The resolved `EarnTokenDetails` is handed over, not the activity row's
    // skeleton token — `EarnInputView` needs the map entry to find its market.
    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: {
        token: expect.objectContaining({
          address: USDC_ADDRESS,
          symbol: 'USDC',
          balanceFormatted: '25 USDC',
        }),
      },
    });
  });

  it('switches to the token network before navigating', async () => {
    arrangeLendableUsdc();

    const { result } = renderHook(() =>
      useActivityDetailsLendAgain({
        token: usdcActivityToken,
        fallbackCaipChainId: ARBITRUM_CAIP_CHAIN_ID,
      }),
    );
    await result.current.onLendAgain();

    expect(mockFindNetworkClientIdByChainId).toHaveBeenCalledWith('0xa4b1');
    expect(mockSetActiveNetwork).toHaveBeenCalledWith('arbitrum-client-id');
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it.each([
    [
      'the token is not in the earn map (market delisted or feature flag off)',
      () => arrangeEarnTokens({}),
    ],
    [
      'the resolved token is a pooled-staking token rather than a lending one',
      () =>
        arrangeEarnTokens({
          '42161': {
            [USDC_ADDRESS.toLowerCase()]: makeEarnToken(
              EARN_EXPERIENCES.POOLED_STAKING,
            ),
          },
        }),
    ],
    [
      'the token is on a chain with no earn markets',
      () =>
        arrangeEarnTokens({
          '1': {
            [USDC_ADDRESS.toLowerCase()]: makeEarnToken(
              EARN_EXPERIENCES.STABLECOIN_LENDING,
            ),
          },
        }),
    ],
  ])('reports no CTA and does not navigate when %s', async (_case, arrange) => {
    arrange();

    const { result } = renderHook(() =>
      useActivityDetailsLendAgain({
        token: usdcActivityToken,
        fallbackCaipChainId: ARBITRUM_CAIP_CHAIN_ID,
      }),
    );

    expect(result.current.canLendAgain).toBe(false);

    await result.current.onLendAgain();

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockSetActiveNetwork).not.toHaveBeenCalled();
  });

  it.each([
    ['no token at all', undefined],
    [
      'a native asset with no contract address',
      { symbol: 'ETH', assetId: 'eip155:42161/slip44:60' } as TokenAmount,
    ],
    [
      'a non-EVM token',
      {
        symbol: 'USDC',
        assetId:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      } as TokenAmount,
    ],
  ])('reports no CTA for %s', (_case, token) => {
    arrangeLendableUsdc();

    const { result } = renderHook(() =>
      useActivityDetailsLendAgain({
        token,
        fallbackCaipChainId: ARBITRUM_CAIP_CHAIN_ID,
      }),
    );

    expect(result.current.canLendAgain).toBe(false);
  });

  it('matches the earn map entry regardless of address casing', () => {
    arrangeLendableUsdc();

    const { result } = renderHook(() =>
      useActivityDetailsLendAgain({
        token: {
          ...usdcActivityToken,
          assetId: `${ARBITRUM_CAIP_CHAIN_ID}/erc20:${USDC_ADDRESS.toUpperCase()}`,
        } as TokenAmount,
        fallbackCaipChainId: ARBITRUM_CAIP_CHAIN_ID,
      }),
    );

    expect(result.current.canLendAgain).toBe(true);
  });
});
