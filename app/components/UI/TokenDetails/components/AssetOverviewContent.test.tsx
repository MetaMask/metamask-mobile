import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import AssetOverviewContent, {
  type AssetOverviewContentProps,
} from './AssetOverviewContent';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import { TokenI } from '../../Tokens/types';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';

const mockHandlePerpsAction = jest.fn();
const mockTrack = jest.fn();

jest.mock('../hooks/usePerpsActions', () => ({
  usePerpsActions: () => ({
    hasPerpsMarket: true,
    marketData: { symbol: 'ETH', name: 'ETH', maxLeverage: '50x' },
    isLoading: false,
    error: null,
    handlePerpsAction: mockHandlePerpsAction,
  }),
}));

jest.mock('../../Perps/hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({ track: mockTrack }),
}));

// Use a stable wrapper so jest.restoreAllMocks() (from testSetup.js afterEach)
// does not wipe the implementation between tests.
const mockPerpsBottomSheetTooltipInner = jest.fn((..._args: unknown[]) => null);
jest.mock('../../Perps/components/PerpsBottomSheetTooltip', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockPerpsBottomSheetTooltipInner(...args),
}));

jest.mock('../../../../selectors/featureFlagController/tokenDetailsV2', () => ({
  selectTokenDetailsV2Enabled: jest.fn(() => true),
  selectTokenDetailsV2ButtonsEnabled: jest.fn(() => true),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
    }),
    useFocusEffect: jest.fn((cb: () => void) => cb()),
  };
});

function createState(isEligible: boolean) {
  return {
    engine: {
      backgroundState: {
        ...backgroundState,
        PerpsController: {
          ...(backgroundState as { PerpsController?: object }).PerpsController,
          isEligible,
        },
        RemoteFeatureFlagController: {
          ...(backgroundState as { RemoteFeatureFlagController?: object })
            .RemoteFeatureFlagController,
          remoteFeatureFlags: {},
        },
        AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      },
    },
  };
}

const defaultToken: TokenI = {
  address: '0x123',
  chainId: '0x1',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  balance: '1',
  balanceFiat: '$2000',
  logo: '',
  image: '',
  isETH: false,
  hasBalanceError: false,
  aggregators: [],
};

const defaultProps: AssetOverviewContentProps = {
  token: defaultToken,
  balance: '1',
  mainBalance: '$2000',
  secondaryBalance: '1 ETH',
  currentPrice: 2000,
  priceDiff: 0,
  comparePrice: 2000,
  prices: [],
  isLoading: false,
  timePeriod: '1d',
  setTimePeriod: jest.fn(),
  chartNavigationButtons: ['1d', '1w', '1m'],
  isPerpsEnabled: true,
  isMerklCampaignClaimingEnabled: false,
  displayBuyButton: false,
  displaySwapsButton: false,
  currentCurrency: 'USD',
  onBuy: jest.fn(),
  onSend: jest.fn().mockResolvedValue(undefined),
  onReceive: jest.fn(),
  goToSwaps: jest.fn(),
};

describe('AssetOverviewContent', () => {
  describe('Long / Short with perps eligibility', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('shows geo block modal and tracks event when Long is pressed and user is not eligible', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewContent {...defaultProps} />,
        { state: createState(false) },
      );

      fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.LONG_BUTTON));

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_SCREEN_VIEWED,
        {
          [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
            PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
          [PERPS_EVENT_PROPERTY.SOURCE]:
            PERPS_EVENT_VALUE.SOURCE.ASSET_DETAIL_SCREEN,
        },
      );
      expect(mockHandlePerpsAction).not.toHaveBeenCalled();
    });

    it('shows geo block modal and tracks event when Short is pressed and user is not eligible', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewContent {...defaultProps} />,
        { state: createState(false) },
      );

      fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.SHORT_BUTTON));

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_SCREEN_VIEWED,
        {
          [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
            PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
          [PERPS_EVENT_PROPERTY.SOURCE]:
            PERPS_EVENT_VALUE.SOURCE.ASSET_DETAIL_SCREEN,
        },
      );
      expect(mockHandlePerpsAction).not.toHaveBeenCalled();
    });

    it('calls handlePerpsAction with long when Long is pressed and user is eligible', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewContent {...defaultProps} />,
        { state: createState(true) },
      );

      fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.LONG_BUTTON));

      expect(mockHandlePerpsAction).toHaveBeenCalledWith('long');
      expect(mockTrack).not.toHaveBeenCalled();
    });

    it('calls handlePerpsAction with short when Short is pressed and user is eligible', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewContent {...defaultProps} />,
        { state: createState(true) },
      );

      fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.SHORT_BUTTON));

      expect(mockHandlePerpsAction).toHaveBeenCalledWith('short');
      expect(mockTrack).not.toHaveBeenCalled();
    });

    it('closes geo block modal when closeEligibilityModal is called', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewContent {...defaultProps} />,
        { state: createState(false) },
      );

      // Open the geo block modal by pressing Long when not eligible
      fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.LONG_BUTTON));

      // Verify the tooltip was rendered with the expected props
      expect(mockPerpsBottomSheetTooltipInner).toHaveBeenCalledWith(
        expect.objectContaining({
          onClose: expect.any(Function),
          contentKey: 'geo_block',
        }),
        expect.anything(),
      );

      // Extract onClose from the last render call and invoke it
      const lastCallProps = mockPerpsBottomSheetTooltipInner.mock.calls[
        mockPerpsBottomSheetTooltipInner.mock.calls.length - 1
      ][0] as { onClose: () => void };
      mockPerpsBottomSheetTooltipInner.mockClear();

      act(() => {
        lastCallProps.onClose();
      });

      // Modal dismissed — tooltip no longer rendered
      expect(mockPerpsBottomSheetTooltipInner).not.toHaveBeenCalled();
    });
  });
});
