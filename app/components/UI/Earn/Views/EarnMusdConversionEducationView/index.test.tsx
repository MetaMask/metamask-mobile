import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Hex } from '@metamask/utils';
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

describe('EarnMusdConversionEducationView', () => {
  const mockDispatch = jest.fn();
  const mockInitiateConversion = jest.fn();
  const mockNavigation = {
    setOptions: jest.fn(),
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true),
  };

  const mockRouteParams = {
    preferredPaymentToken: {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Hex,
      chainId: '0x1' as Hex,
    },
    outputChainId: '0x1' as Hex,
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
      const { getByText } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      expect(
        getByText(
          strings('earn.musd_conversion.education.heading', {
            percentage: MUSD_CONVERSION_APY,
          }),
        ),
      ).toBeOnTheScreen();
      expect(
        getByText(
          strings('earn.musd_conversion.education.description', {
            percentage: MUSD_CONVERSION_APY,
          }),
        ),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('earn.musd_conversion.education.primary_button')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('earn.musd_conversion.education.secondary_button')),
      ).toBeOnTheScreen();
    });
  });

  describe('redux actions', () => {
    it('dispatches setMusdConversionEducationSeen when continue button pressed', async () => {
      const { getByText } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByText(strings('earn.musd_conversion.education.primary_button')),
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

      const { getByText } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByText(strings('earn.musd_conversion.education.primary_button')),
        );
      });

      await waitFor(() => {
        expect(callOrder).toEqual(['dispatch', 'initiateConversion']);
      });
    });
  });

  describe('conversion initiation', () => {
    it('calls initiateConversion with correct params when outputChainId and preferredPaymentToken provided', async () => {
      const { getByText } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByText(strings('earn.musd_conversion.education.primary_button')),
        );
      });

      await waitFor(() => {
        expect(mockInitiateConversion).toHaveBeenCalledTimes(1);
        expect(mockInitiateConversion).toHaveBeenCalledWith({
          outputChainId: mockRouteParams.outputChainId,
          preferredPaymentToken: mockRouteParams.preferredPaymentToken,
          skipEducationCheck: true,
        });
      });
    });

    it('logs error when outputChainId missing but still marks education as seen', async () => {
      const paramsWithoutOutputChainId = {
        preferredPaymentToken: mockRouteParams.preferredPaymentToken,
      };

      mockUseParams.mockReturnValue(paramsWithoutOutputChainId);

      const { getByText } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByText(strings('earn.musd_conversion.education.primary_button')),
        );
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledWith(
          new Error('Missing required parameters'),
          '[mUSD Conversion Education] Cannot proceed without outputChainId and preferredPaymentToken',
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

      const { getByText } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();
      mockBuild.mockClear();

      await act(async () => {
        fireEvent.press(
          getByText(strings('earn.musd_conversion.education.primary_button')),
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

      const { getByText } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();
      mockBuild.mockClear();

      fireEvent.press(
        getByText(strings('earn.musd_conversion.education.secondary_button')),
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
  });

  describe('error handling', () => {
    it('logs error when initiateConversion throws error', async () => {
      const testError = new Error('Conversion failed');
      mockInitiateConversion.mockRejectedValue(testError);

      const { getByText } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByText(strings('earn.musd_conversion.education.primary_button')),
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

      const { getByText } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByText(strings('earn.musd_conversion.education.primary_button')),
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
