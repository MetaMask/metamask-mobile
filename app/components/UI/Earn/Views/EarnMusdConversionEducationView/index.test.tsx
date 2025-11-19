import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { useRoute } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Hex } from '@metamask/utils';
import EarnMusdConversionEducationView from './index';
import {
  setMusdConversionEducationSeen,
  UserActionType,
} from '../../../../../actions/user';
import { useEvmTokenConversion } from '../../hooks/useEvmTokenConversion';
import Logger from '../../../../../util/Logger';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useRoute: jest.fn(),
  };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../../actions/user', () => ({
  setMusdConversionEducationSeen: jest.fn(),
}));

jest.mock('../../hooks/useEvmTokenConversion', () => ({
  useEvmTokenConversion: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockSetMusdConversionEducationSeen =
  setMusdConversionEducationSeen as jest.MockedFunction<
    typeof setMusdConversionEducationSeen
  >;
const mockUseEvmTokenConversion = useEvmTokenConversion as jest.MockedFunction<
  typeof useEvmTokenConversion
>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;

describe('EarnMusdConversionEducationView', () => {
  const mockDispatch = jest.fn();
  const mockInitiateConversion = jest.fn();

  const mockRouteParams = {
    preferredPaymentToken: {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Hex,
      chainId: '0x1' as Hex,
    },
    outputToken: {
      address: '0x3B3B3B3B3B3B3B3B3B3B3B3B3B3B3B3B3B3B3B3B' as Hex,
      chainId: '0x1' as Hex,
      symbol: 'mUSD',
      name: 'MetaMask USD',
      decimals: 6,
    },
    allowedPaymentTokens: {
      '0x1': [
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Hex,
        '0xdAC17F958D2ee523a2206206994597C13D831ec7' as Hex,
      ],
    } as Record<Hex, Hex[]>,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseDispatch.mockReturnValue(mockDispatch);
    mockUseEvmTokenConversion.mockReturnValue({
      initiateConversion: mockInitiateConversion,
      error: null,
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
        getByText(strings('earn.musd_conversion_education.heading')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('earn.musd_conversion_education.description')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('earn.musd_conversion_education.continue_button')),
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
          getByText(strings('earn.musd_conversion_education.continue_button')),
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
          getByText(strings('earn.musd_conversion_education.continue_button')),
        );
      });

      await waitFor(() => {
        expect(callOrder).toEqual(['dispatch', 'initiateConversion']);
      });
    });
  });

  describe('conversion initiation', () => {
    it('calls initiateConversion with correct params when outputToken and preferredPaymentToken provided', async () => {
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
          getByText(strings('earn.musd_conversion_education.continue_button')),
        );
      });

      await waitFor(() => {
        expect(mockInitiateConversion).toHaveBeenCalledTimes(1);
        expect(mockInitiateConversion).toHaveBeenCalledWith({
          outputToken: mockRouteParams.outputToken,
          preferredPaymentToken: mockRouteParams.preferredPaymentToken,
          allowedPaymentTokens: mockRouteParams.allowedPaymentTokens,
        });
      });
    });

    it('logs error when outputToken missing but still marks education as seen', async () => {
      const paramsWithoutOutputToken = {
        preferredPaymentToken: mockRouteParams.preferredPaymentToken,
      };

      mockUseRoute.mockReturnValue({
        params: paramsWithoutOutputToken,
        key: 'test-key',
        name: 'test-name',
      });

      const { getByText } = renderWithProvider(
        <EarnMusdConversionEducationView />,
        { state: {} },
      );

      await act(async () => {
        fireEvent.press(
          getByText(strings('earn.musd_conversion_education.continue_button')),
        );
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledWith(
          new Error('Missing outputToken parameter'),
          '[mUSD Conversion Education] Cannot proceed without output token',
        );
        expect(mockInitiateConversion).not.toHaveBeenCalled();
      });
    });

    it('logs error when preferredPaymentToken missing', async () => {
      const paramsWithoutPaymentToken = {
        outputToken: mockRouteParams.outputToken,
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
          getByText(strings('earn.musd_conversion_education.continue_button')),
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
          getByText(strings('earn.musd_conversion_education.continue_button')),
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
          getByText(strings('earn.musd_conversion_education.continue_button')),
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
