import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { RootState } from '../../../../../reducers';
import AssetOverviewClaimBonus from '.';
import {
  useMerklBonusClaim,
  MerklClaimData,
} from '../MerklRewards/hooks/useMerklBonusClaim';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents, EVENT_NAME } from '../../../../../core/Analytics';
import { MUSD_EVENTS_CONSTANTS } from '../../constants/events/musdEvents';
import AppConstants from '../../../../../core/AppConstants';
import { ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS } from './AssetOverviewClaimBonus.testIds';
import { TokenI } from '../../../Tokens/types';
import useTokenBalance from '../../../TokenDetails/hooks/useTokenBalance';
import { selectAsset } from '../../../../../selectors/assets/assets-list';
import { MUSD_TOKEN_ADDRESS } from '../../constants/musd';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../MerklRewards/hooks/useMerklBonusClaim');
jest.mock('../../../../hooks/useAnalytics/useAnalytics');
jest.mock('../../../TokenDetails/hooks/useTokenBalance');
jest.mock('../../../../../selectors/assets/assets-list', () => ({
  selectAsset: jest.fn(),
}));
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(),
  canOpenURL: jest.fn(),
  getInitialURL: jest.fn(),
}));

const mockUseMerklBonusClaim = useMerklBonusClaim as jest.MockedFunction<
  typeof useMerklBonusClaim
>;
const mockSelectAsset = selectAsset as jest.MockedFunction<typeof selectAsset>;

const createMockAsset = (overrides: Partial<TokenI> = {}): TokenI => ({
  address: '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898',
  chainId: '0x1',
  symbol: 'aglaMerkl',
  aggregators: [],
  decimals: 18,
  image: '',
  name: 'Angle Merkl',
  balance: '1000',
  balanceFiat: '$100',
  logo: '',
  isETH: false,
  isNative: false,
  ...overrides,
});

const createMockMerklClaimData = (
  overrides: Partial<MerklClaimData> = {},
): MerklClaimData => ({
  claimableReward: null,
  lifetimeBonusClaimed: null,
  hasPendingClaim: false,
  isClaiming: false,
  error: null,
  claimRewards: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const mockInitialState: DeepPartial<RootState> = {
  engine: { backgroundState },
};

describe('AssetOverviewClaimBonus', () => {
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();
  const mockAddProperties = jest.fn();
  const mockBuild = jest.fn();
  const mockClaimRewards = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();

    mockBuild.mockReturnValue({ name: 'mock-built-event' });
    mockAddProperties.mockReturnValue({ build: mockBuild });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });

    (useAnalytics as jest.MockedFunction<typeof useAnalytics>).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as unknown as ReturnType<typeof useAnalytics>);

    (
      useTokenBalance as jest.MockedFunction<typeof useTokenBalance>
    ).mockReturnValue({
      balance: '1000',
      fiatBalance: '$1000',
      tokenFormattedBalance: '1000 mUSD',
      isTronNative: false,
      stakedTrxAsset: undefined,
      inLockPeriodBalance: undefined,
      readyForWithdrawalBalance: undefined,
    });

    mockUseMerklBonusClaim.mockReturnValue(
      createMockMerklClaimData({
        claimableReward: '10.01',
        lifetimeBonusClaimed: '221.59',
        claimRewards: mockClaimRewards,
      }),
    );

    mockSelectAsset.mockReturnValue(undefined);
  });

  describe('always renders for eligible tokens', () => {
    it('renders the section header, tag, rows, and CTA', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus asset={createMockAsset()} />,
        { state: mockInitialState },
      );

      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CONTAINER),
      ).toBeOnTheScreen();
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.SECTION_HEADER),
      ).toBeOnTheScreen();
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.BONUS_TAG),
      ).toBeOnTheScreen();
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.ANNUAL_BONUS_ROW),
      ).toBeOnTheScreen();
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.LIFETIME_ROW),
      ).toBeOnTheScreen();
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIM_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders even when claimableReward is null', () => {
      mockUseMerklBonusClaim.mockReturnValue(
        createMockMerklClaimData({ claimableReward: null }),
      );

      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus asset={createMockAsset()} />,
        { state: mockInitialState },
      );

      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CONTAINER),
      ).toBeOnTheScreen();
    });
  });

  describe('State A: balance > 0, claimable > 0', () => {
    it('shows correct CTA label, annual bonus, and lifetime bonus', () => {
      mockUseMerklBonusClaim.mockReturnValue(
        createMockMerklClaimData({
          claimableReward: '10.27',
          lifetimeBonusClaimed: '221.59',
          claimRewards: mockClaimRewards,
        }),
      );

      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus
          asset={createMockAsset({ balance: '1000', balanceFiat: '$1000' })}
        />,
        { state: mockInitialState },
      );

      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIM_BUTTON),
      ).toHaveTextContent('Claim $10.27 bonus');
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIM_BUTTON),
      ).not.toBeDisabled();
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.ANNUAL_BONUS_VALUE),
      ).toHaveTextContent('+$30.00');
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.LIFETIME_VALUE),
      ).toHaveTextContent('+$221.59');
    });
  });

  describe('State B: balance > 0, claimable = 0', () => {
    it('shows "Accruing next bonus" disabled CTA', () => {
      (
        useTokenBalance as jest.MockedFunction<typeof useTokenBalance>
      ).mockReturnValue({
        balance: '500',
        fiatBalance: '$500',
        tokenFormattedBalance: '500 mUSD',
        isTronNative: false,
        stakedTrxAsset: undefined,
        inLockPeriodBalance: undefined,
        readyForWithdrawalBalance: undefined,
      });
      mockUseMerklBonusClaim.mockReturnValue(
        createMockMerklClaimData({
          claimableReward: null,
          lifetimeBonusClaimed: '100.00',
        }),
      );

      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus
          asset={createMockAsset({ balance: '500', balanceFiat: '$500' })}
        />,
        { state: mockInitialState },
      );

      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIM_BUTTON),
      ).toHaveTextContent('Accruing next bonus');
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIM_BUTTON),
      ).toBeDisabled();
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.ANNUAL_BONUS_VALUE),
      ).toHaveTextContent('+$15.00');
    });
  });

  describe('State C: balance = 0, claimable > 0', () => {
    it('shows $0.00 annual bonus and enabled claim CTA', () => {
      (
        useTokenBalance as jest.MockedFunction<typeof useTokenBalance>
      ).mockReturnValue({
        balance: '0',
        fiatBalance: '$0',
        tokenFormattedBalance: '0 mUSD',
        isTronNative: false,
        stakedTrxAsset: undefined,
        inLockPeriodBalance: undefined,
        readyForWithdrawalBalance: undefined,
      });
      mockUseMerklBonusClaim.mockReturnValue(
        createMockMerklClaimData({
          claimableReward: '5.50',
          lifetimeBonusClaimed: '50.00',
          claimRewards: mockClaimRewards,
        }),
      );

      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus
          asset={createMockAsset({ balance: '0', balanceFiat: '$0' })}
        />,
        { state: mockInitialState },
      );

      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIM_BUTTON),
      ).toHaveTextContent('Claim $5.50 bonus');
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIM_BUTTON),
      ).not.toBeDisabled();
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.ANNUAL_BONUS_VALUE),
      ).toHaveTextContent('+$0.00');
    });
  });

  describe('State D: balance = 0, claimable = 0', () => {
    it('shows "No accruing bonus" disabled CTA and $0.00 values', () => {
      (
        useTokenBalance as jest.MockedFunction<typeof useTokenBalance>
      ).mockReturnValue({
        balance: '0',
        fiatBalance: '$0',
        tokenFormattedBalance: '0 mUSD',
        isTronNative: false,
        stakedTrxAsset: undefined,
        inLockPeriodBalance: undefined,
        readyForWithdrawalBalance: undefined,
      });
      mockUseMerklBonusClaim.mockReturnValue(
        createMockMerklClaimData({
          claimableReward: null,
          lifetimeBonusClaimed: '0.00',
        }),
      );

      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus
          asset={createMockAsset({ balance: '0', balanceFiat: '$0' })}
        />,
        { state: mockInitialState },
      );

      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIM_BUTTON),
      ).toHaveTextContent('No accruing bonus');
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIM_BUTTON),
      ).toBeDisabled();
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.ANNUAL_BONUS_VALUE),
      ).toHaveTextContent('+$0.00');
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.LIFETIME_VALUE),
      ).toHaveTextContent('$0.00');
    });
  });

  describe('loading state', () => {
    it('disables claim button when isClaiming is true', () => {
      mockUseMerklBonusClaim.mockReturnValue(
        createMockMerklClaimData({
          claimableReward: '10.01',
          isClaiming: true,
        }),
      );

      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus asset={createMockAsset()} />,
        { state: mockInitialState },
      );

      const button = getByTestId(
        ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIM_BUTTON,
      );
      expect(button).toBeDisabled();
    });

    it('disables claim button when hasPendingClaim is true', () => {
      mockUseMerklBonusClaim.mockReturnValue(
        createMockMerklClaimData({
          claimableReward: '10.01',
          hasPendingClaim: true,
        }),
      );

      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus asset={createMockAsset()} />,
        { state: mockInitialState },
      );

      const button = getByTestId(
        ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIM_BUTTON,
      );
      expect(button).toBeDisabled();
    });
  });

  describe('claim action', () => {
    it('calls claimRewards on claim button press', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus asset={createMockAsset()} />,
        { state: mockInitialState },
      );

      fireEvent.press(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIM_BUTTON),
      );

      expect(mockClaimRewards).toHaveBeenCalledTimes(1);
    });

    it('fires MUSD_CLAIM_BONUS_BUTTON_CLICKED with correct properties on claim press', () => {
      const asset = createMockAsset();

      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus asset={asset} />,
        { state: mockInitialState },
      );

      fireEvent.press(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIM_BUTTON),
      );

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MUSD_CLAIM_BONUS_BUTTON_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          location: MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.ASSET_OVERVIEW,
          action_type: 'claim_bonus',
          network_chain_id: asset.chainId,
          asset_symbol: asset.symbol,
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'mock-built-event' });
    });

    it('prevents duplicate claim presses via isClaimPressedRef guard', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus asset={createMockAsset()} />,
        { state: mockInitialState },
      );

      const button = getByTestId(
        ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIM_BUTTON,
      );
      fireEvent.press(button);
      fireEvent.press(button);

      expect(mockClaimRewards).toHaveBeenCalledTimes(1);
    });

    it('does not call claimRewards when CTA is disabled (State B)', () => {
      mockUseMerklBonusClaim.mockReturnValue(
        createMockMerklClaimData({
          claimableReward: null,
          claimRewards: mockClaimRewards,
        }),
      );

      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus
          asset={createMockAsset({ balance: '1000' })}
        />,
        { state: mockInitialState },
      );

      fireEvent.press(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIM_BUTTON),
      );

      expect(mockClaimRewards).not.toHaveBeenCalled();
    });
  });

  describe('tooltip / info button', () => {
    it('opens tooltip modal with correct content on info button press', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus asset={createMockAsset()} />,
        { state: mockInitialState },
      );

      fireEvent.press(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.INFO_BUTTON),
      );

      expect(mockNavigate).toHaveBeenCalledTimes(1);

      const [, navArgs] = mockNavigate.mock.calls[0];
      const { params } = navArgs;

      expect(params.title).toBe('Your bonus');
      expect(params.footerText).toBeUndefined();
      expect(params.buttonText).toBe('Learn more');
    });

    it('fires TOOLTIP_OPENED analytics on info button press', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus asset={createMockAsset()} />,
        { state: mockInitialState },
      );

      fireEvent.press(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.INFO_BUTTON),
      );

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        EVENT_NAME.TOOLTIP_OPENED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          location: MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.ASSET_OVERVIEW,
          tooltip_name: 'your_bonus_info',
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'mock-built-event' });
    });

    it('passes dismissOnButtonPress: false when opening the Learn More tooltip', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus asset={createMockAsset()} />,
        { state: mockInitialState },
      );

      fireEvent.press(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.INFO_BUTTON),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            dismissOnButtonPress: false,
          }),
        }),
      );
    });
  });

  describe('mUSD balance aggregation across mainnet and Linea', () => {
    const createMockMusdAsset = (balance: string) =>
      ({
        address: MUSD_TOKEN_ADDRESS,
        chainId: CHAIN_IDS.MAINNET,
        symbol: 'mUSD',
        balance,
      }) as unknown as ReturnType<typeof selectAsset>;

    const mockPerChainMusdBalance = ({
      mainnet,
      linea,
    }: {
      mainnet?: string;
      linea?: string;
    }) => {
      mockSelectAsset.mockImplementation((_state, params) => {
        if (params?.chainId === CHAIN_IDS.MAINNET) {
          return mainnet !== undefined
            ? createMockMusdAsset(mainnet)
            : undefined;
        }
        if (params?.chainId === CHAIN_IDS.LINEA_MAINNET) {
          return linea !== undefined ? createMockMusdAsset(linea) : undefined;
        }
        return undefined;
      });
    };

    it('uses the sum of mainnet and Linea mUSD balances for the estimated annual bonus', () => {
      mockPerChainMusdBalance({ mainnet: '700', linea: '300' });
      mockUseMerklBonusClaim.mockReturnValue(
        createMockMerklClaimData({
          claimableReward: '5.00',
          lifetimeBonusClaimed: '50.00',
          claimRewards: mockClaimRewards,
        }),
      );

      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus
          asset={createMockAsset({
            address: MUSD_TOKEN_ADDRESS,
            symbol: 'mUSD',
            balance: '0',
          })}
        />,
        { state: mockInitialState },
      );

      // (700 + 300) * 3% = 30.00
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.ANNUAL_BONUS_VALUE),
      ).toHaveTextContent('+$30.00');
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIM_BUTTON),
      ).toHaveTextContent('Claim $5.00 bonus');
    });

    it('uses the mainnet balance alone when Linea returns no asset', () => {
      mockPerChainMusdBalance({ mainnet: '500' });
      mockUseMerklBonusClaim.mockReturnValue(
        createMockMerklClaimData({ claimableReward: null }),
      );

      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus
          asset={createMockAsset({
            address: MUSD_TOKEN_ADDRESS,
            symbol: 'mUSD',
            balance: '0',
          })}
        />,
        { state: mockInitialState },
      );

      // 500 * 3% = 15.00, "Accruing next bonus" because balance > 0 & no claim
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.ANNUAL_BONUS_VALUE),
      ).toHaveTextContent('+$15.00');
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIM_BUTTON),
      ).toHaveTextContent('Accruing next bonus');
    });

    it('uses the Linea balance alone when mainnet returns no asset', () => {
      mockPerChainMusdBalance({ linea: '200' });
      mockUseMerklBonusClaim.mockReturnValue(
        createMockMerklClaimData({ claimableReward: null }),
      );

      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus
          asset={createMockAsset({
            address: MUSD_TOKEN_ADDRESS,
            symbol: 'mUSD',
            balance: '0',
          })}
        />,
        { state: mockInitialState },
      );

      // 200 * 3% = 6.00 — regression guard for the checksum fix (8ee95eb):
      // before the fix, selectAsset was called with a non-checksummed address
      // on Linea and always returned undefined, dropping Linea balances.
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.ANNUAL_BONUS_VALUE),
      ).toHaveTextContent('+$6.00');
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIM_BUTTON),
      ).toHaveTextContent('Accruing next bonus');
    });

    it('treats balance as zero when neither chain returns an mUSD asset', () => {
      mockPerChainMusdBalance({});
      mockUseMerklBonusClaim.mockReturnValue(
        createMockMerklClaimData({
          claimableReward: null,
          lifetimeBonusClaimed: '0.00',
        }),
      );

      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus
          asset={createMockAsset({
            address: MUSD_TOKEN_ADDRESS,
            symbol: 'mUSD',
            balance: '999',
          })}
        />,
        { state: mockInitialState },
      );

      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.ANNUAL_BONUS_VALUE),
      ).toHaveTextContent('+$0.00');
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIM_BUTTON),
      ).toHaveTextContent('No accruing bonus');
      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIM_BUTTON),
      ).toBeDisabled();
    });

    it('ignores useTokenBalance liveBalance for mUSD assets', () => {
      // liveBalance of 9_999 would imply +$299.97 annual if the non-mUSD
      // fallback ran; the aggregated path must use 100 + 50 = 150 instead.
      (
        useTokenBalance as jest.MockedFunction<typeof useTokenBalance>
      ).mockReturnValue({
        balance: '9999',
        fiatBalance: '$9999',
        tokenFormattedBalance: '9999 mUSD',
        isTronNative: false,
        stakedTrxAsset: undefined,
        inLockPeriodBalance: undefined,
        readyForWithdrawalBalance: undefined,
      });
      mockPerChainMusdBalance({ mainnet: '100', linea: '50' });
      mockUseMerklBonusClaim.mockReturnValue(
        createMockMerklClaimData({ claimableReward: null }),
      );

      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus
          asset={createMockAsset({
            address: MUSD_TOKEN_ADDRESS,
            symbol: 'mUSD',
            balance: '9999',
          })}
        />,
        { state: mockInitialState },
      );

      expect(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.ANNUAL_BONUS_VALUE),
      ).toHaveTextContent('+$4.50');
    });

    it('looks up mUSD on each chain using checksummed addresses', () => {
      mockPerChainMusdBalance({ mainnet: '10', linea: '10' });

      renderWithProvider(
        <AssetOverviewClaimBonus
          asset={createMockAsset({
            address: MUSD_TOKEN_ADDRESS,
            symbol: 'mUSD',
            balance: '0',
          })}
        />,
        { state: mockInitialState },
      );

      const checksummed = toChecksumHexAddress(MUSD_TOKEN_ADDRESS);
      expect(mockSelectAsset).toHaveBeenCalledWith(expect.any(Object), {
        address: checksummed,
        chainId: CHAIN_IDS.MAINNET,
      });
      expect(mockSelectAsset).toHaveBeenCalledWith(expect.any(Object), {
        address: checksummed,
        chainId: CHAIN_IDS.LINEA_MAINNET,
      });
    });
  });

  describe('terms link', () => {
    it('opens terms URL and fires analytics when terms link is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus asset={createMockAsset()} />,
        { state: mockInitialState },
      );

      fireEvent.press(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.INFO_BUTTON),
      );

      const tooltipDescription = mockNavigate.mock.calls[0][1].params.tooltip;

      const { getByText } = renderWithProvider(tooltipDescription, {
        state: mockInitialState,
      });
      fireEvent.press(getByText('Terms apply.'));

      expect(Linking.openURL).toHaveBeenCalledWith(
        AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE,
      );
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MUSD_BONUS_TERMS_OF_USE_PRESSED,
      );
    });
  });
});
