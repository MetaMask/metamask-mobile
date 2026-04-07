import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import AssetOverviewClaimBonus from '.';
import {
  useMerklBonusClaim,
  MerklClaimData,
} from '../MerklRewards/hooks/useMerklBonusClaim';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import useTooltipModal from '../../../../hooks/useTooltipModal';
import { MetaMetricsEvents, EVENT_NAME } from '../../../../../core/Analytics';
import { MUSD_EVENTS_CONSTANTS } from '../../constants/events/musdEvents';
import AppConstants from '../../../../../core/AppConstants';
import { ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS } from './AssetOverviewClaimBonus.testIds';
import { TokenI } from '../../../Tokens/types';
import useTokenBalance from '../../../TokenDetails/hooks/useTokenBalance';

jest.mock('../MerklRewards/hooks/useMerklBonusClaim');
jest.mock('../../../../hooks/useAnalytics/useAnalytics');
jest.mock('../../../../hooks/useTooltipModal');
jest.mock('../../../TokenDetails/hooks/useTokenBalance');
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

describe('AssetOverviewClaimBonus', () => {
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();
  const mockAddProperties = jest.fn();
  const mockBuild = jest.fn();
  const mockOpenTooltipModal = jest.fn();
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
      useTooltipModal as jest.MockedFunction<typeof useTooltipModal>
    ).mockReturnValue({
      openTooltipModal: mockOpenTooltipModal,
    });

    (
      useTokenBalance as jest.MockedFunction<typeof useTokenBalance>
    ).mockReturnValue({
      balance: '1000',
      fiatBalance: '$1000',
      tokenFormattedBalance: '1000 mUSD',
    });

    mockUseMerklBonusClaim.mockReturnValue(
      createMockMerklClaimData({
        claimableReward: '10.01',
        lifetimeBonusClaimed: '221.59',
        claimRewards: mockClaimRewards,
      }),
    );
  });

  describe('always renders for eligible tokens', () => {
    it('renders the section header, tag, rows, and CTA', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus asset={createMockAsset()} />,
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
      ).toHaveTextContent('+$0.00');
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
        createMockMerklClaimData({ claimableReward: null }),
      );

      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus
          asset={createMockAsset({ balance: '1000' })}
        />,
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
      );

      fireEvent.press(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.INFO_BUTTON),
      );

      expect(mockOpenTooltipModal).toHaveBeenCalledTimes(1);

      const [title, , footer, buttonText] = mockOpenTooltipModal.mock.calls[0];

      expect(title).toBe('Your bonus');
      expect(footer).toBeUndefined();
      expect(buttonText).toBe('Learn more');
    });

    it('fires TOOLTIP_OPENED analytics on info button press', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus asset={createMockAsset()} />,
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
  });

  describe('terms link', () => {
    it('opens terms URL and fires analytics when terms link is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewClaimBonus asset={createMockAsset()} />,
      );

      fireEvent.press(
        getByTestId(ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.INFO_BUTTON),
      );

      const tooltipDescription = mockOpenTooltipModal.mock.calls[0][1];

      const { getByText } = renderWithProvider(tooltipDescription);
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
