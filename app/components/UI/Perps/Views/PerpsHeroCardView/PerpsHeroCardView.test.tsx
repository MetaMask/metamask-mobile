import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { act } from '@testing-library/react-hooks';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import PerpsHeroCardView from './PerpsHeroCardView';
import { selectReferralCode } from '../../../../../reducers/rewards/selectors';
import { selectPerpsRewardsReferralCodeEnabledFlag } from '../../selectors/featureFlags';
import { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';
import Logger from '../../../../../util/Logger';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import {
  PerpsHeroCardViewSelectorsIDs,
  getPerpsHeroCardViewSelector,
} from '../../Perps.testIds';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockShowToast = jest.fn();
const mockTrack = jest.fn();

jest.mock('../../../../../util/theme', () => ({
  useAppThemeFromContext: jest.fn(() => ({
    colors: {
      text: { default: '#000000', alternative: '#000000' },
      primary: { inverse: '#FFFFFF', default: '#037DD6' },
      background: { default: '#FFFFFF', alternative: '#F2F4F6' },
      border: { default: '#BBC0C5', muted: '#D6D9DC' },
      icon: { default: '#24272A', alternative: '#6A737D' },
      overlay: { default: '#00000099' },
      shadow: { default: '#00000026' },
      error: { default: '#D73A49', muted: '#F97583' },
      warning: { default: '#F66A0A', muted: '#F8AA4B' },
      success: { default: '#28A745', muted: '#85E29D' },
      info: { default: '#037DD6', muted: '#66CAFF' },
    },
    themeAppearance: 'light',
  })),
}));
jest.mock('@react-navigation/native');
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn() }));
jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: jest.fn() },
}));
jest.mock('react-redux');
jest.mock('../../hooks', () => ({
  usePerpsToasts: jest.fn(() => ({
    showToast: mockShowToast,
    PerpsToastOptions: {
      contentSharing: {
        pnlHeroCard: {
          shareSuccess: { variant: 'success' },
          shareFailed: { variant: 'error' },
        },
      },
    },
  })),
}));
jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(() => ({ track: mockTrack })),
}));
jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key, params) => {
    if (key === 'perps.pnl_hero_card.share_message') {
      return `Check out my ${params?.asset} trade! Code: ${params?.code} Link: ${params?.link}`;
    }
    return key;
  }),
}));
jest.mock('../../utils/formatUtils', () => ({
  formatPerpsFiat: jest.fn((value) => `$${value}`),
  parseCurrencyString: jest.fn((value) => value?.replace('$', '') || ''),
  PRICE_RANGES_MINIMAL_VIEW: [],
}));
jest.mock('../../../Rewards/utils', () => ({
  buildReferralUrl: jest.fn(
    (code) => `https://link.metamask.io/rewards?referral=${code}`,
  ),
}));
jest.mock('../../../Rewards/hooks/useReferralDetails', () => ({
  useReferralDetails: jest.fn(),
}));
jest.mock('../../../Rewards/hooks/useSeasonStatus', () => ({
  useSeasonStatus: jest.fn(),
}));
jest.mock('@metamask/design-tokens', () => ({
  brandColor: {
    black: '#000000',
    white: '#FFFFFF',
  },
  darkTheme: {
    colors: {
      background: {
        mutedHover: '#color1',
      },
      accent04: {
        light: '#color2',
      },
    },
  },
}));
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      safeAreaContainer: {},
      header: {},
      closeButton: {},
      headerTitle: {},
      carouselWrapper: {},
      carousel: {},
      cardContainer: {},
      backgroundImage: {},
      heroCardTopRow: {},
      metamaskLogo: {},
      heroCardAssetRow: {},
      assetIcon: {},
      assetName: {},
      directionBadge: {},
      directionBadgeText: {},
      pnlText: {},
      pnlPositive: {},
      pnlNegative: {},
      priceRowsContainer: {},
      priceRow: {},
      priceLabel: {},
      priceValue: {},
      qrCodeContainer: {},
      carouselDotIndicator: {},
      progressDot: {},
      progressDotActive: {},
      footerButtonContainer: {},
    },
    theme: {
      colors: {
        text: { default: '#000000', alternative: '#000000' },
        primary: { inverse: '#FFFFFF', default: '#037DD6' },
        background: { default: '#FFFFFF', alternative: '#F2F4F6' },
        border: { default: '#BBC0C5', muted: '#D6D9DC' },
        icon: { default: '#24272A', alternative: '#6A737D' },
        overlay: { default: '#00000099' },
        shadow: { default: '#00000026' },
        error: { default: '#D73A49', muted: '#F97583' },
        warning: { default: '#F66A0A', muted: '#F8AA4B' },
        success: { default: '#28A745', muted: '#85E29D' },
        info: { default: '#037DD6', muted: '#66CAFF' },
      },
      themeAppearance: 'light',
    },
  })),
}));
jest.mock('../../components/PerpsTokenLogo', () => 'PerpsTokenLogo');
jest.mock(
  '../../../Rewards/components/RewardsReferralCodeTag',
  () => 'RewardsReferralCodeTag',
);
jest.mock(
  '@tommasini/react-native-scrollable-tab-view',
  () => 'ScrollableTabView',
);

const mockCaptureRef = captureRef as jest.MockedFunction<typeof captureRef>;
const mockShareOpen = Share.open as jest.MockedFunction<typeof Share.open>;
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

/**
 * Helper function to create mock route params with position data
 */
const createMockRouteParams = (overrides = {}) => ({
  params: {
    position: {
      symbol: 'BTC',
      size: '0.5',
      entryPrice: '50000',
      unrealizedPnl: '5000',
      returnOnEquity: '0.10',
      leverage: { value: 10 },
      ...overrides,
    },
    marketPrice: '$55000',
  },
});

describe('PerpsHeroCardView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // By default, referral flag is disabled (feature gated off)
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectReferralCode) {
        return 'TESTCODE123';
      }
      if (selector === selectPerpsRewardsReferralCodeEnabledFlag) {
        return false;
      }
      return undefined;
    });
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
    } as never);
    mockUseRoute.mockReturnValue(createMockRouteParams() as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering with referral code', () => {
    beforeEach(() => {
      // Enable the referral feature flag for these tests
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectReferralCode) {
          return 'TESTCODE123';
        }
        if (selector === selectPerpsRewardsReferralCodeEnabledFlag) {
          return true;
        }
        return undefined;
      });
    });

    it('displays referral code tag', () => {
      const { getByTestId } = render(<PerpsHeroCardView />);

      const referralCodeTag = getByTestId(
        getPerpsHeroCardViewSelector.referralCodeTag(0),
      );

      expect(referralCodeTag).toBeOnTheScreen();
    });

    it('displays asset symbol from position', () => {
      const { getByTestId } = render(<PerpsHeroCardView />);

      const assetSymbol = getByTestId(
        getPerpsHeroCardViewSelector.assetSymbol(0),
      );

      expect(assetSymbol).toHaveTextContent('BTC');
    });

    it('displays direction badge with leverage', () => {
      const { getByTestId } = render(<PerpsHeroCardView />);

      const directionBadgeText = getByTestId(
        getPerpsHeroCardViewSelector.directionBadgeText(0),
      );

      expect(directionBadgeText).toHaveTextContent('Long 10x');
    });

    it('displays PnL percentage with positive prefix', () => {
      const { getByTestId } = render(<PerpsHeroCardView />);

      const pnlText = getByTestId(getPerpsHeroCardViewSelector.pnlText(0));

      expect(pnlText).toHaveTextContent('+10.0%');
    });
  });

  describe('rendering without referral code', () => {
    beforeEach(() => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectReferralCode) {
          return null;
        }
        if (selector === selectPerpsRewardsReferralCodeEnabledFlag) {
          return true;
        }
        return undefined;
      });
    });

    it('does not render referral code tag', () => {
      const { queryByTestId } = render(<PerpsHeroCardView />);

      const referralCodeTag = queryByTestId(
        getPerpsHeroCardViewSelector.referralCodeTag(0),
      );

      expect(referralCodeTag).toBeNull();
    });

    it('renders asset symbol', () => {
      const { getByTestId } = render(<PerpsHeroCardView />);

      const assetSymbol = getByTestId(
        getPerpsHeroCardViewSelector.assetSymbol(0),
      );

      expect(assetSymbol).toHaveTextContent('BTC');
    });
  });

  describe('rendering with referral flag disabled', () => {
    beforeEach(() => {
      // Flag disabled even though code exists
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectReferralCode) {
          return 'TESTCODE123';
        }
        if (selector === selectPerpsRewardsReferralCodeEnabledFlag) {
          return false;
        }
        return undefined;
      });
    });

    it('does not render referral code tag when flag is disabled', () => {
      const { queryByTestId } = render(<PerpsHeroCardView />);

      const referralCodeTag = queryByTestId(
        getPerpsHeroCardViewSelector.referralCodeTag(0),
      );

      expect(referralCodeTag).toBeNull();
    });

    it('renders asset symbol when flag is disabled', () => {
      const { getByTestId } = render(<PerpsHeroCardView />);

      const assetSymbol = getByTestId(
        getPerpsHeroCardViewSelector.assetSymbol(0),
      );

      expect(assetSymbol).toHaveTextContent('BTC');
    });
  });

  describe('carousel functionality', () => {
    it('renders carousel container', () => {
      const { getByTestId } = render(<PerpsHeroCardView />);

      const carousel = getByTestId(PerpsHeroCardViewSelectorsIDs.CAROUSEL);

      expect(carousel).toBeOnTheScreen();
    });

    it('renders dot indicator', () => {
      const { getByTestId } = render(<PerpsHeroCardView />);

      const dotIndicator = getByTestId(
        PerpsHeroCardViewSelectorsIDs.DOT_INDICATOR,
      );

      expect(dotIndicator).toBeOnTheScreen();
    });
  });

  describe('share functionality - success', () => {
    beforeEach(() => {
      mockCaptureRef.mockResolvedValue('file://image.png');
      mockShareOpen.mockResolvedValue({ success: true, message: 'shared' });
      // Enable referral flag for share tests
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectReferralCode) {
          return 'TESTCODE123';
        }
        if (selector === selectPerpsRewardsReferralCodeEnabledFlag) {
          return true;
        }
        return undefined;
      });
    });

    it('calls captureRef when share pressed', async () => {
      const { getByTestId } = render(<PerpsHeroCardView />);

      await act(async () => {
        fireEvent.press(
          getByTestId(PerpsHeroCardViewSelectorsIDs.SHARE_BUTTON),
        );
      });

      await waitFor(() => {
        expect(mockCaptureRef).toHaveBeenCalled();
      });
    });

    it('calls Share.open with image URI and type', async () => {
      const { getByTestId } = render(<PerpsHeroCardView />);

      await act(async () => {
        fireEvent.press(
          getByTestId(PerpsHeroCardViewSelectorsIDs.SHARE_BUTTON),
        );
      });

      await waitFor(() => {
        expect(mockShareOpen).toHaveBeenCalledWith(
          expect.objectContaining({
            url: 'file://image.png',
            type: 'image/png',
          }),
        );
      });
    });

    it('tracks PERPS_UI_INTERACTION with INITIATED status', async () => {
      const { getByTestId } = render(<PerpsHeroCardView />);

      await act(async () => {
        fireEvent.press(
          getByTestId(PerpsHeroCardViewSelectorsIDs.SHARE_BUTTON),
        );
      });

      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalledWith(
          MetaMetricsEvents.PERPS_UI_INTERACTION,
          expect.objectContaining({
            [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.INITIATED,
            [PerpsEventProperties.INTERACTION_TYPE]:
              PerpsEventValues.INTERACTION_TYPE.SHARE_PNL_HERO_CARD,
          }),
        );
      });
    });

    it('tracks PERPS_UI_INTERACTION with SUCCESS status', async () => {
      const { getByTestId } = render(<PerpsHeroCardView />);

      await act(async () => {
        fireEvent.press(
          getByTestId(PerpsHeroCardViewSelectorsIDs.SHARE_BUTTON),
        );
      });

      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalledWith(
          MetaMetricsEvents.PERPS_UI_INTERACTION,
          expect.objectContaining({
            [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.SUCCESS,
            [PerpsEventProperties.INTERACTION_TYPE]:
              PerpsEventValues.INTERACTION_TYPE.SHARE_PNL_HERO_CARD,
          }),
        );
      });
    });

    it('shows success toast', async () => {
      const { getByTestId } = render(<PerpsHeroCardView />);

      await act(async () => {
        fireEvent.press(
          getByTestId(PerpsHeroCardViewSelectorsIDs.SHARE_BUTTON),
        );
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'success' }),
        );
      });
    });
  });

  describe('share functionality - failure', () => {
    it('logs error to Logger when captureRef fails', async () => {
      const error = new Error('Capture failed');
      mockCaptureRef.mockRejectedValue(error);

      const { getByTestId } = render(<PerpsHeroCardView />);

      await act(async () => {
        fireEvent.press(
          getByTestId(PerpsHeroCardViewSelectorsIDs.SHARE_BUTTON),
        );
      });

      await waitFor(() => {
        expect(Logger.error).toHaveBeenCalledWith(
          error,
          expect.objectContaining({
            message: 'Error capturing Perps Hero Card',
            context: 'PerpsHeroCardView.captureCard',
          }),
        );
      });
    });

    it('tracks FAILED status when Share.open throws error', async () => {
      const error = new Error('Share failed');
      mockCaptureRef.mockResolvedValue('file://image.png');
      mockShareOpen.mockRejectedValue(error);

      const { getByTestId } = render(<PerpsHeroCardView />);

      await act(async () => {
        fireEvent.press(
          getByTestId(PerpsHeroCardViewSelectorsIDs.SHARE_BUTTON),
        );
      });

      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalledWith(
          MetaMetricsEvents.PERPS_UI_INTERACTION,
          expect.objectContaining({
            [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
            [PerpsEventProperties.ERROR_MESSAGE]: 'Share failed',
            [PerpsEventProperties.INTERACTION_TYPE]:
              PerpsEventValues.INTERACTION_TYPE.SHARE_PNL_HERO_CARD,
          }),
        );
      });
    });

    it('shows error toast when Share.open fails', async () => {
      mockCaptureRef.mockResolvedValue('file://image.png');
      mockShareOpen.mockRejectedValue(new Error('Share failed'));

      const { getByTestId } = render(<PerpsHeroCardView />);

      await act(async () => {
        fireEvent.press(
          getByTestId(PerpsHeroCardViewSelectorsIDs.SHARE_BUTTON),
        );
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'error' }),
        );
      });
    });

    it('does not show error toast when user dismisses share dialog', async () => {
      mockCaptureRef.mockResolvedValue('file://image.png');
      mockShareOpen.mockResolvedValue({
        success: false,
        dismissedAction: true,
        message: '',
      });

      const { getByTestId } = render(<PerpsHeroCardView />);

      await act(async () => {
        fireEvent.press(
          getByTestId(PerpsHeroCardViewSelectorsIDs.SHARE_BUTTON),
        );
      });

      await waitFor(() => {
        expect(mockShareOpen).toHaveBeenCalled();
      });

      expect(mockShowToast).not.toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'error' }),
      );
    });

    it('logs error to Logger when Share.open fails', async () => {
      const error = new Error('Share failed');
      mockCaptureRef.mockResolvedValue('file://image.png');
      mockShareOpen.mockRejectedValue(error);

      const { getByTestId } = render(<PerpsHeroCardView />);

      await act(async () => {
        fireEvent.press(
          getByTestId(PerpsHeroCardViewSelectorsIDs.SHARE_BUTTON),
        );
      });

      await waitFor(() => {
        expect(Logger.error).toHaveBeenCalledWith(
          error,
          expect.objectContaining({
            message: 'Error sharing Perps Hero Card',
            context: 'PerpsHeroCardView.handleShare',
          }),
        );
      });
    });
  });

  describe('navigation', () => {
    it('calls goBack when close button pressed', () => {
      const { getByTestId } = render(<PerpsHeroCardView />);

      fireEvent.press(getByTestId(PerpsHeroCardViewSelectorsIDs.CLOSE_BUTTON));

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('data formatting', () => {
    it('displays Short badge with leverage for negative size position', () => {
      mockUseRoute.mockReturnValue(
        createMockRouteParams({ size: '-0.5' }) as never,
      );

      const { getByTestId } = render(<PerpsHeroCardView />);

      const directionBadgeText = getByTestId(
        getPerpsHeroCardViewSelector.directionBadgeText(0),
      );

      expect(directionBadgeText).toHaveTextContent('Short 10x');
    });

    it('displays negative PnL percentage without positive prefix', () => {
      mockUseRoute.mockReturnValue(
        createMockRouteParams({
          unrealizedPnl: '-5000',
          returnOnEquity: '-0.10',
        }) as never,
      );

      const { getByTestId } = render(<PerpsHeroCardView />);

      const pnlText = getByTestId(getPerpsHeroCardViewSelector.pnlText(0));

      expect(pnlText).toHaveTextContent('-10.0%');
    });
  });
});
