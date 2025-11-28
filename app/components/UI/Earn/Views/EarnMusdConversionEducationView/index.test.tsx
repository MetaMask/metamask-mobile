import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
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

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useRoute: jest.fn(),
    useNavigation: jest.fn(),
    useFocusEffect: jest.fn(),
  };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../../actions/user', () => ({
  setMusdConversionEducationSeen: jest.fn(),
}));

jest.mock('../../hooks/useMusdConversion', () => ({
  useMusdConversion: jest.fn(),
}));

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

const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;
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
const mockLogger = Logger as jest.Mocked<typeof Logger>;

describe('EarnMusdConversionEducationView', () => {
  const mockDispatch = jest.fn();
  const mockInitiateConversion = jest.fn();
  const mockNavigation = {
    setOptions: jest.fn(),
    navigate: jest.fn(),
    goBack: jest.fn(),
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

    mockUseDispatch.mockReturnValue(mockDispatch);
    // @ts-expect-error - partial mock of navigation is sufficient for testing
    mockUseNavigation.mockReturnValue(mockNavigation);
    mockUseFocusEffect.mockImplementation((callback) => {
      callback();
    });
    mockUseMusdConversion.mockReturnValue({
      initiateConversion: mockInitiateConversion,
      error: null,
      hasSeenMusdEducationScreen: false,
    });
    mockSetMusdConversionEducationSeen.mockReturnValue({
      type: 'SET_MUSD_CONVERSION_EDUCATION_SEEN' as UserActionType.SET_MUSD_CONVERSION_EDUCATION_SEEN,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders mUSD conversion education screen with all UI elements', () => {
      mockUseRoute.mockReturnValue({
        params: mockRouteParams,
        key: 'test-key',
        name: 'test-name',
      });

      const { getByText } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      expect(
        getByText(strings('earn.musd_conversion.education.heading')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('earn.musd_conversion.education.description')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('earn.musd_conversion.education.continue_button')),
      ).toBeOnTheScreen();
    });
  });

  describe('redux actions', () => {
    it('dispatches setMusdConversionEducationSeen when continue button pressed', async () => {
      mockUseRoute.mockReturnValue({
        params: mockRouteParams,
        key: 'test-key',
        name: 'test-name',
      });

      const { getByText } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByText(strings('earn.musd_conversion.education.continue_button')),
        );
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'SET_MUSD_CONVERSION_EDUCATION_SEEN',
        });
      });
    });

    it('marks education as seen before initiating conversion', async () => {
      mockUseRoute.mockReturnValue({
        params: mockRouteParams,
        key: 'test-key',
        name: 'test-name',
      });

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
          getByText(strings('earn.musd_conversion.education.continue_button')),
        );
      });

      await waitFor(() => {
        expect(callOrder).toEqual(['dispatch', 'initiateConversion']);
      });
    });
  });

  describe('conversion initiation', () => {
    it('calls initiateConversion with correct params when outputChainId and preferredPaymentToken provided', async () => {
      mockUseRoute.mockReturnValue({
        params: mockRouteParams,
        key: 'test-key',
        name: 'test-name',
      });

      const { getByText } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByText(strings('earn.musd_conversion.education.continue_button')),
        );
      });

      await waitFor(() => {
        expect(mockInitiateConversion).toHaveBeenCalledTimes(1);
        expect(mockInitiateConversion).toHaveBeenCalledWith({
          outputChainId: mockRouteParams.outputChainId,
          preferredPaymentToken: mockRouteParams.preferredPaymentToken,
        });
      });
    });

    it('logs error when outputChainId missing but still marks education as seen', async () => {
      const paramsWithoutOutputChainId = {
        preferredPaymentToken: mockRouteParams.preferredPaymentToken,
      };

      mockUseRoute.mockReturnValue({
        params: paramsWithoutOutputChainId,
        key: 'test-key',
        name: 'test-name',
      });

      const { getByText } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByText(strings('earn.musd_conversion.education.continue_button')),
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

    it('logs error when preferredPaymentToken missing', async () => {
      const paramsWithoutPaymentToken = {
        outputChainId: mockRouteParams.outputChainId,
      };

      mockUseRoute.mockReturnValue({
        params: paramsWithoutPaymentToken,
        key: 'test-key',
        name: 'test-name',
      });

      const { getByText } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByText(strings('earn.musd_conversion.education.continue_button')),
        );
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledTimes(1);
        expect(mockInitiateConversion).not.toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('logs error when initiateConversion throws error', async () => {
      const testError = new Error('Conversion failed');
      mockInitiateConversion.mockRejectedValue(testError);

      mockUseRoute.mockReturnValue({
        params: mockRouteParams,
        key: 'test-key',
        name: 'test-name',
      });

      const { getByText } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByText(strings('earn.musd_conversion.education.continue_button')),
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

      mockUseRoute.mockReturnValue({
        params: mockRouteParams,
        key: 'test-key',
        name: 'test-name',
      });

      const { getByText } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByText(strings('earn.musd_conversion.education.continue_button')),
        );
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'SET_MUSD_CONVERSION_EDUCATION_SEEN',
        });
      });
    });
  });
});
