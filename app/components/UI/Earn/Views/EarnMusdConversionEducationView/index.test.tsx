import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Hex } from '@metamask/utils';
import { Linking } from 'react-native';
import EarnMusdConversionEducationView from './index';
import {
  setMusdConversionEducationSeen,
  UserActionType,
} from '../../../../../actions/user';
import Logger from '../../../../../util/Logger';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
import { useMusdConversion } from '../../hooks/useMusdConversion';
import { useParams } from '../../../../../util/navigation/navUtils';
import { MUSD_CONVERSION_APY } from '../../constants/musd';
import { EARN_TEST_IDS } from '../../constants/testIds';
import { useMusdConversionFlowData } from '../../hooks/useMusdConversionFlowData';
import { useRampNavigation } from '../../../Ramp/hooks/useRampNavigation';
import Routes from '../../../../../constants/navigation/Routes';
import AppConstants from '../../../../../core/AppConstants';

const FIXED_NOW_MS = 1730000000000;
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockAddProperties = jest.fn();
const mockBuild = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: jest.fn(),
    useFocusEffect: jest.fn(),
  };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
  createNavigationDetails: jest.fn((_root, screen) => ({
    name: screen,
    params: {},
  })),
}));

jest.mock('../../../../../actions/user', () => ({
  setMusdConversionEducationSeen: jest.fn(),
  UserActionType: {
    SET_MUSD_CONVERSION_EDUCATION_SEEN: 'SET_MUSD_CONVERSION_EDUCATION_SEEN',
  },
}));

jest.mock('../../hooks/useMusdConversion', () => ({
  useMusdConversion: jest.fn(),
}));

jest.mock('../../hooks/useMusdConversionFlowData', () => ({
  useMusdConversionFlowData: jest.fn(),
}));

jest.mock('../../../Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: jest.fn(),
}));

jest.mock('../../../../hooks/useMetrics', () => {
  const actual = jest.requireActual('../../../../hooks/useMetrics');
  return {
    ...actual,
    useMetrics: () => ({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    }),
  };
});

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn().mockReturnValue({
    colors: {
      background: { default: '#FFFFFF' },
      text: { default: '#000000' },
    },
    themeAppearance: 'light',
    typography: {},
    shadows: {},
    brandColors: {},
  }),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
  typeof useFocusEffect
>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockSetMusdConversionEducationSeen =
  setMusdConversionEducationSeen as jest.MockedFunction<
    typeof setMusdConversionEducationSeen
  >;
const mockUseMusdConversion = useMusdConversion as jest.MockedFunction<
  typeof useMusdConversion
>;
const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;
const mockUseMusdConversionFlowData =
  useMusdConversionFlowData as jest.MockedFunction<
    typeof useMusdConversionFlowData
  >;
const mockUseRampNavigation = useRampNavigation as jest.MockedFunction<
  typeof useRampNavigation
>;

const mockConversionToken = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: '0x1',
  aggregators: [],
  decimals: 6,
  image: '',
  name: 'USD Coin',
  symbol: 'USDC',
  balance: '1000000',
  logo: undefined,
  isETH: false,
};

describe('EarnMusdConversionEducationView', () => {
  const mockDispatch = jest.fn();
  const mockInitiateConversion = jest.fn();
  const mockGoToAggregator = jest.fn();
  const mockGetPreferredPaymentToken = jest.fn();
  const mockGetChainIdForBuyFlow = jest.fn();
  const mockNavigation = {
    setOptions: jest.fn(),
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true),
    reset: jest.fn(),
  };

  const mockRouteParams = {
    preferredPaymentToken: {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Hex,
      chainId: '0x1' as Hex,
    },
    isDeeplink: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW_MS);

    mockUseDispatch.mockReturnValue(mockDispatch);
    mockUseNavigation.mockReturnValue(mockNavigation);
    mockUseFocusEffect.mockImplementation((callback) => {
      callback();
    });
    mockUseParams.mockReturnValue(mockRouteParams);
    mockUseMusdConversion.mockReturnValue({
      initiateConversion: mockInitiateConversion,
      error: null,
      hasSeenConversionEducationScreen: false,
    });
    mockSetMusdConversionEducationSeen.mockImplementation((seen: boolean) => ({
      type: UserActionType.SET_MUSD_CONVERSION_EDUCATION_SEEN,
      payload: {
        seen,
      },
    }));

    mockGetPreferredPaymentToken.mockReturnValue({
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      chainId: '0x1',
    });
    mockGetChainIdForBuyFlow.mockReturnValue('0x1' as Hex);

    mockUseMusdConversionFlowData.mockReturnValue({
      isGeoEligible: true,
      hasConvertibleTokens: true,
      isEmptyWallet: false,
      getPaymentTokenForSelectedNetwork: mockGetPreferredPaymentToken,
      getChainIdForBuyFlow: mockGetChainIdForBuyFlow,
      isMusdBuyable: true,
      isPopularNetworksFilterActive: false,
      selectedChainId: null,
      selectedChains: [],
      conversionTokens: [mockConversionToken],
      isMusdBuyableOnChain: {},
      isMusdBuyableOnAnyChain: false,
    });

    mockUseRampNavigation.mockReturnValue({
      goToBuy: jest.fn(),
      goToAggregator: mockGoToAggregator,
      goToSell: jest.fn(),
      goToDeposit: jest.fn(),
    });

    mockBuild.mockReturnValue({ name: 'mock-built-event' });
    mockAddProperties.mockImplementation(() => ({ build: mockBuild }));
    mockCreateEventBuilder.mockImplementation(() => ({
      addProperties: mockAddProperties,
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders mUSD conversion education screen with all UI elements', () => {
      const { getByText, getByTestId } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      const descriptionText = strings(
        'earn.musd_conversion.education.description',
        {
          percentage: MUSD_CONVERSION_APY,
        },
      );

      expect(
        getByText(
          strings('earn.musd_conversion.education.heading', {
            percentage: MUSD_CONVERSION_APY,
          }),
        ),
      ).toBeOnTheScreen();
      expect(getByText(descriptionText, { exact: false })).toBeOnTheScreen();
      expect(
        getByText(strings('earn.musd_conversion.education.terms_apply')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('earn.musd_conversion.education.primary_button')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('earn.musd_conversion.education.secondary_button')),
      ).toBeOnTheScreen();
      expect(
        getByTestId(
          EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.BACKGROUND_IMAGE,
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('deeplink detection', () => {
    it('does not use deeplink logic when isDeeplink is false', async () => {
      mockUseParams.mockReturnValue({
        preferredPaymentToken: {
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Hex,
          chainId: '0x1' as Hex,
        },
        isDeeplink: false,
      });

      const { getByTestId } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(
            EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.PRIMARY_BUTTON,
          ),
        );
      });

      // Should call initiateConversion directly, not deeplink logic
      await waitFor(() => {
        expect(mockInitiateConversion).toHaveBeenCalledWith({
          preferredPaymentToken: {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            chainId: '0x1',
          },
          skipEducationCheck: true,
        });
        expect(mockNavigation.navigate).not.toHaveBeenCalledWith(
          Routes.WALLET.HOME,
          expect.anything(),
        );
        expect(mockGoToAggregator).not.toHaveBeenCalled();
      });
    });

    it('uses deeplink logic when isDeeplink is true', async () => {
      mockUseParams.mockReturnValue({
        preferredPaymentToken: null,
        isDeeplink: true,
      });

      const { getByTestId } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(
            EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.PRIMARY_BUTTON,
          ),
        );
      });

      // Should use deeplink logic
      await waitFor(() => {
        expect(mockInitiateConversion).toHaveBeenCalled();
      });
    });

    it('logs error when normal flow missing params', async () => {
      mockUseParams.mockReturnValue({
        preferredPaymentToken: null,
        isDeeplink: false,
      });

      const { getByTestId } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(
            EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.PRIMARY_BUTTON,
          ),
        );
      });

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.any(Error),
          '[mUSD Conversion Education] Cannot proceed without preferredPaymentToken',
        );
      });
    });
  });

  describe('deeplink routing', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({
        preferredPaymentToken: null,
        isDeeplink: true,
      });
    });

    it('navigates to home when user is geo-ineligible', async () => {
      mockUseMusdConversionFlowData.mockReturnValue({
        isGeoEligible: false,
        hasConvertibleTokens: true,
        isEmptyWallet: false,
        getPaymentTokenForSelectedNetwork: mockGetPreferredPaymentToken,
        getChainIdForBuyFlow: mockGetChainIdForBuyFlow,
        isMusdBuyable: true,
        isPopularNetworksFilterActive: false,
        selectedChainId: null,
        selectedChains: [],
        conversionTokens: [mockConversionToken],
        isMusdBuyableOnChain: {},
        isMusdBuyableOnAnyChain: false,
      });

      const { getByTestId } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(
            EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.PRIMARY_BUTTON,
          ),
        );
      });

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          Routes.WALLET.HOME,
          {
            screen: Routes.WALLET.TAB_STACK_FLOW,
            params: {
              screen: Routes.WALLET_VIEW,
            },
          },
        );
      });
    });

    it('navigates to home when no convertible tokens and mUSD is not buyable', async () => {
      mockUseMusdConversionFlowData.mockReturnValue({
        isGeoEligible: true,
        hasConvertibleTokens: false,
        isEmptyWallet: true,
        getPaymentTokenForSelectedNetwork: jest.fn().mockReturnValue(null),
        getChainIdForBuyFlow: mockGetChainIdForBuyFlow,
        isMusdBuyable: false,
        isPopularNetworksFilterActive: false,
        selectedChainId: null,
        selectedChains: [],
        conversionTokens: [],
        isMusdBuyableOnChain: {},
        isMusdBuyableOnAnyChain: false,
      });

      const { getByTestId } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(
            EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.PRIMARY_BUTTON,
          ),
        );
      });

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          Routes.WALLET.HOME,
          {
            screen: Routes.WALLET.TAB_STACK_FLOW,
            params: {
              screen: Routes.WALLET_VIEW,
            },
          },
        );
      });
    });

    it('navigates to home when has convertible tokens but no valid payment token and mUSD is not buyable', async () => {
      mockUseMusdConversionFlowData.mockReturnValue({
        isGeoEligible: true,
        hasConvertibleTokens: true,
        isEmptyWallet: false,
        getPaymentTokenForSelectedNetwork: jest.fn().mockReturnValue(null),
        getChainIdForBuyFlow: mockGetChainIdForBuyFlow,
        isMusdBuyable: false,
        isPopularNetworksFilterActive: false,
        selectedChainId: null,
        selectedChains: [],
        conversionTokens: [mockConversionToken],
        isMusdBuyableOnChain: {},
        isMusdBuyableOnAnyChain: false,
      });

      const { getByTestId } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(
            EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.PRIMARY_BUTTON,
          ),
        );
      });

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          Routes.WALLET.HOME,
          {
            screen: Routes.WALLET.TAB_STACK_FLOW,
            params: {
              screen: Routes.WALLET_VIEW,
            },
          },
        );
      });
    });

    it('tracks home_screen redirect when navigating home due to ineligibility', async () => {
      mockUseMusdConversionFlowData.mockReturnValue({
        isGeoEligible: false,
        hasConvertibleTokens: true,
        isEmptyWallet: false,
        getPaymentTokenForSelectedNetwork: mockGetPreferredPaymentToken,
        getChainIdForBuyFlow: mockGetChainIdForBuyFlow,
        isMusdBuyable: true,
        isPopularNetworksFilterActive: false,
        selectedChainId: null,
        selectedChains: [],
        conversionTokens: [mockConversionToken],
        isMusdBuyableOnChain: {},
        isMusdBuyableOnAnyChain: false,
      });

      const { MetaMetricsEvents } = jest.requireActual(
        '../../../../hooks/useMetrics',
      );

      const { getByTestId } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();
      mockBuild.mockClear();

      await act(async () => {
        fireEvent.press(
          getByTestId(
            EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.PRIMARY_BUTTON,
          ),
        );
      });

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.MUSD_FULLSCREEN_ANNOUNCEMENT_BUTTON_CLICKED,
        );

        expect(mockAddProperties).toHaveBeenCalledWith({
          location: 'conversion_education_screen',
          button_type: 'primary',
          button_text: strings('earn.musd_conversion.continue'),
          redirects_to: 'home',
        });
      });
    });
  });

  describe('external links', () => {
    it('opens bonus terms of use when "Terms apply" is pressed', () => {
      const openUrlSpy = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValueOnce(undefined);

      const { getByText } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      fireEvent.press(
        getByText(strings('earn.musd_conversion.education.terms_apply')),
      );

      expect(openUrlSpy).toHaveBeenCalledTimes(1);
      expect(openUrlSpy).toHaveBeenCalledWith(
        AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE,
      );
    });
  });

  describe('redux actions', () => {
    it('dispatches setMusdConversionEducationSeen when continue button pressed', async () => {
      const { getByTestId } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(
            EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.PRIMARY_BUTTON,
          ),
        );
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({
          type: UserActionType.SET_MUSD_CONVERSION_EDUCATION_SEEN,
          payload: { seen: true },
        });
      });
    });

    it('marks education as seen before initiating conversion', async () => {
      const callOrder: string[] = [];

      mockDispatch.mockImplementation(() => {
        callOrder.push('dispatch');
      });
      mockInitiateConversion.mockImplementation(async () => {
        callOrder.push('initiateConversion');
      });

      const { getByTestId } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(
            EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.PRIMARY_BUTTON,
          ),
        );
      });

      await waitFor(() => {
        expect(callOrder).toEqual(['dispatch', 'initiateConversion']);
      });
    });
  });

  describe('conversion initiation', () => {
    it('calls initiateConversion with correct params when preferredPaymentToken provided', async () => {
      const { getByTestId } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(
            EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.PRIMARY_BUTTON,
          ),
        );
      });

      await waitFor(() => {
        expect(mockInitiateConversion).toHaveBeenCalledTimes(1);
        expect(mockInitiateConversion).toHaveBeenCalledWith({
          preferredPaymentToken: mockRouteParams.preferredPaymentToken,
          skipEducationCheck: true,
        });
      });
    });

    it('logs error when preferredPaymentToken missing but still marks education as seen', async () => {
      mockUseParams.mockReturnValue({});

      const { getByTestId } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(
            EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.PRIMARY_BUTTON,
          ),
        );
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledWith(
          new Error('Missing required parameters'),
          '[mUSD Conversion Education] Cannot proceed without preferredPaymentToken',
        );
        expect(mockInitiateConversion).not.toHaveBeenCalled();
      });
    });
  });

  describe('MetaMetrics', () => {
    it('tracks fullscreen announcement displayed event once per visit', () => {
      const { MetaMetricsEvents } = jest.requireActual(
        '../../../../hooks/useMetrics',
      );

      const { unmount } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      expect(mockCreateEventBuilder).toHaveBeenCalledTimes(1);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MUSD_FULLSCREEN_ANNOUNCEMENT_DISPLAYED,
      );

      expect(mockAddProperties).toHaveBeenCalledTimes(1);
      expect(mockAddProperties).toHaveBeenCalledWith({
        location: 'conversion_education_screen',
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith({
        name: 'mock-built-event',
      });

      unmount();

      renderWithProvider(<EarnMusdConversionEducationView />, { state: {} });

      expect(mockCreateEventBuilder).toHaveBeenCalledTimes(2);
      expect(mockCreateEventBuilder).toHaveBeenNthCalledWith(
        2,
        MetaMetricsEvents.MUSD_FULLSCREEN_ANNOUNCEMENT_DISPLAYED,
      );

      expect(mockAddProperties).toHaveBeenCalledTimes(2);
      expect(mockAddProperties).toHaveBeenNthCalledWith(2, {
        location: 'conversion_education_screen',
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
      expect(mockTrackEvent).toHaveBeenNthCalledWith(2, {
        name: 'mock-built-event',
      });
    });

    it('tracks fullscreen announcement button clicked event when continue button is pressed', async () => {
      const { MetaMetricsEvents } = jest.requireActual(
        '../../../../hooks/useMetrics',
      );

      const { getByTestId } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();
      mockBuild.mockClear();

      await act(async () => {
        fireEvent.press(
          getByTestId(
            EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.PRIMARY_BUTTON,
          ),
        );
      });

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledTimes(1);
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.MUSD_FULLSCREEN_ANNOUNCEMENT_BUTTON_CLICKED,
        );

        expect(mockAddProperties).toHaveBeenCalledTimes(1);
        expect(mockAddProperties).toHaveBeenCalledWith({
          location: 'conversion_education_screen',
          button_type: 'primary',
          button_text: strings('earn.musd_conversion.education.primary_button'),
          redirects_to: 'custom_amount_screen',
        });

        expect(mockTrackEvent).toHaveBeenCalledTimes(1);
        expect(mockTrackEvent).toHaveBeenCalledWith({
          name: 'mock-built-event',
        });
      });
    });

    it('tracks fullscreen announcement button clicked event when go back button is pressed', () => {
      const { MetaMetricsEvents } = jest.requireActual(
        '../../../../hooks/useMetrics',
      );

      const { getByTestId } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();
      mockBuild.mockClear();

      fireEvent.press(
        getByTestId(
          EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.SECONDARY_BUTTON,
        ),
      );

      expect(mockCreateEventBuilder).toHaveBeenCalledTimes(1);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MUSD_FULLSCREEN_ANNOUNCEMENT_BUTTON_CLICKED,
      );

      expect(mockAddProperties).toHaveBeenCalledTimes(1);
      expect(mockAddProperties).toHaveBeenCalledWith({
        location: 'conversion_education_screen',
        button_type: 'secondary',
        button_text: strings('earn.musd_conversion.education.secondary_button'),
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'mock-built-event' });
    });

    it('tracks buy button text and buy_screen redirect when deeplink triggers buy flow', async () => {
      mockUseParams.mockReturnValue({
        preferredPaymentToken: null,
        isDeeplink: true,
      });

      mockUseMusdConversionFlowData.mockReturnValue({
        isGeoEligible: true,
        hasConvertibleTokens: false,
        isEmptyWallet: true,
        getPaymentTokenForSelectedNetwork: mockGetPreferredPaymentToken,
        getChainIdForBuyFlow: mockGetChainIdForBuyFlow,
        isMusdBuyable: true,
        isPopularNetworksFilterActive: false,
        selectedChainId: null,
        selectedChains: [],
        conversionTokens: [],
        isMusdBuyableOnChain: {},
        isMusdBuyableOnAnyChain: false,
      });

      const { MetaMetricsEvents } = jest.requireActual(
        '../../../../hooks/useMetrics',
      );

      const { getByTestId } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();
      mockBuild.mockClear();

      await act(async () => {
        fireEvent.press(
          getByTestId(
            EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.PRIMARY_BUTTON,
          ),
        );
      });

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.MUSD_FULLSCREEN_ANNOUNCEMENT_BUTTON_CLICKED,
        );

        expect(mockAddProperties).toHaveBeenCalledWith({
          location: 'conversion_education_screen',
          button_type: 'primary',
          button_text: strings('earn.musd_conversion.buy_musd'),
          redirects_to: 'buy_screen',
        });
      });
    });
  });

  describe('error handling', () => {
    it('logs error when initiateConversion throws error', async () => {
      const testError = new Error('Conversion failed');
      mockInitiateConversion.mockRejectedValue(testError);

      const { getByTestId } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(
            EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.PRIMARY_BUTTON,
          ),
        );
      });

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledWith(
          testError,
          '[mUSD Conversion Education] Failed to initiate conversion',
        );
      });
    });

    it('still marks education as seen even if conversion fails', async () => {
      const testError = new Error('Conversion failed');
      mockInitiateConversion.mockRejectedValue(testError);

      const { getByTestId } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(
            EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.PRIMARY_BUTTON,
          ),
        );
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({
          type: UserActionType.SET_MUSD_CONVERSION_EDUCATION_SEEN,
          payload: { seen: true },
        });
      });
    });
  });
});
