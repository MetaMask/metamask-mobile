import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('../../hooks/useMusdConversionTokens');
jest.mock('../../hooks/useMusdConversion');
jest.mock('../../../Ramp/hooks/useRampNavigation');
jest.mock('../../../../../util/Logger');

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'earn.musd_conversion.buy_musd': 'Buy mUSD',
      'earn.musd_conversion.get_musd': 'Get mUSD',
      'earn.musd_conversion.earn_points_daily': 'Earn points daily',
    };
    return map[key] ?? key;
  },
}));

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MusdConversionCta from './MusdConversionCta';
import { useMusdConversionTokens } from '../../hooks/useMusdConversionTokens';
import { useMusdConversion } from '../../hooks/useMusdConversion';
import { useRampNavigation } from '../../../Ramp/hooks/useRampNavigation';
import {
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../../constants/musd';
import { EARN_TEST_IDS } from '../../constants/testIds';
import initialRootState from '../../../../../util/test/initial-root-state';
import Logger from '../../../../../util/Logger';

const mockToken = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: '0x1',
  symbol: 'USDC',
  aggregators: [],
  decimals: 6,
  image: 'https://example.com/usdc.png',
  name: 'USD Coin',
  balance: '1000000000',
  logo: 'https://example.com/usdc.png',
  isETH: false,
};

describe('MusdConversionCta', () => {
  const mockGoToBuy = jest.fn();
  const mockInitiateConversion = jest.fn();
  const mockLoggerError = jest.spyOn(Logger, 'error');

  beforeEach(() => {
    jest.clearAllMocks();

    (
      useRampNavigation as jest.MockedFunction<typeof useRampNavigation>
    ).mockReturnValue({
      goToBuy: mockGoToBuy,
      goToAggregator: jest.fn(),
      goToSell: jest.fn(),
      goToDeposit: jest.fn(),
    });

    (
      useMusdConversion as jest.MockedFunction<typeof useMusdConversion>
    ).mockReturnValue({
      initiateConversion: mockInitiateConversion,
      error: null,
      hasSeenConversionEducationScreen: true,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders component with container testID', () => {
      (
        useMusdConversionTokens as jest.MockedFunction<
          typeof useMusdConversionTokens
        >
      ).mockReturnValue({
        tokens: [],
        tokenFilter: jest.fn(),
        isConversionToken: jest.fn(),
      });

      const { getByTestId } = renderWithProvider(<MusdConversionCta />, {
        state: initialRootState,
      });

      expect(getByTestId(EARN_TEST_IDS.MUSD.CONVERSION_CTA)).toBeOnTheScreen();
    });

    it('displays MetaMask USD text', () => {
      (
        useMusdConversionTokens as jest.MockedFunction<
          typeof useMusdConversionTokens
        >
      ).mockReturnValue({
        tokens: [],
        tokenFilter: jest.fn(),
        isConversionToken: jest.fn(),
      });

      const { getByText } = renderWithProvider(<MusdConversionCta />, {
        state: initialRootState,
      });

      expect(getByText('MetaMask USD')).toBeOnTheScreen();
    });

    it('displays earn points daily text', () => {
      (
        useMusdConversionTokens as jest.MockedFunction<
          typeof useMusdConversionTokens
        >
      ).mockReturnValue({
        tokens: [],
        tokenFilter: jest.fn(),
        isConversionToken: jest.fn(),
      });

      const { getByText } = renderWithProvider(<MusdConversionCta />, {
        state: initialRootState,
      });

      expect(getByText('Earn points daily')).toBeOnTheScreen();
    });
  });

  describe('CTA text', () => {
    it('displays buy_musd when no tokens available', () => {
      (
        useMusdConversionTokens as jest.MockedFunction<
          typeof useMusdConversionTokens
        >
      ).mockReturnValue({
        tokens: [],
        tokenFilter: jest.fn(),
        isConversionToken: jest.fn(),
      });

      const { getByText } = renderWithProvider(<MusdConversionCta />, {
        state: initialRootState,
      });

      expect(getByText('Buy mUSD')).toBeOnTheScreen();
    });

    it('displays get_musd when tokens available', () => {
      (
        useMusdConversionTokens as jest.MockedFunction<
          typeof useMusdConversionTokens
        >
      ).mockReturnValue({
        tokens: [mockToken],
        tokenFilter: jest.fn(),
        isConversionToken: jest.fn(),
      });

      const { getByText } = renderWithProvider(<MusdConversionCta />, {
        state: initialRootState,
      });

      expect(getByText('Get mUSD')).toBeOnTheScreen();
    });
  });

  describe('button press - no tokens', () => {
    beforeEach(() => {
      (
        useMusdConversionTokens as jest.MockedFunction<
          typeof useMusdConversionTokens
        >
      ).mockReturnValue({
        tokens: [],
        tokenFilter: jest.fn(),
        isConversionToken: jest.fn(),
      });
    });

    it('calls goToBuy with correct ramp intent', () => {
      const { getByText } = renderWithProvider(<MusdConversionCta />, {
        state: initialRootState,
      });

      fireEvent.press(getByText('Buy mUSD'));

      expect(mockGoToBuy).toHaveBeenCalledWith({
        assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[MUSD_CONVERSION_DEFAULT_CHAIN_ID],
      });
    });

    it('does not call initiateConversion when no tokens', () => {
      const { getByText } = renderWithProvider(<MusdConversionCta />, {
        state: initialRootState,
      });

      fireEvent.press(getByText('Buy mUSD'));

      expect(mockInitiateConversion).not.toHaveBeenCalled();
    });
  });

  describe('button press - with tokens', () => {
    it('calls initiateConversion with correct parameters', async () => {
      (
        useMusdConversionTokens as jest.MockedFunction<
          typeof useMusdConversionTokens
        >
      ).mockReturnValue({
        tokens: [mockToken],
        tokenFilter: jest.fn(),
        isConversionToken: jest.fn(),
      });

      const { getByText } = renderWithProvider(<MusdConversionCta />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByText('Get mUSD'));
      });

      await waitFor(() => {
        expect(mockInitiateConversion).toHaveBeenCalledWith({
          outputChainId: '0x1',
          preferredPaymentToken: {
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            chainId: '0x1',
          },
        });
      });
    });

    it('uses first token from array when multiple tokens available', async () => {
      const firstToken = mockToken;
      const secondToken = {
        ...mockToken,
        address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      };
      (
        useMusdConversionTokens as jest.MockedFunction<
          typeof useMusdConversionTokens
        >
      ).mockReturnValue({
        tokens: [firstToken, secondToken],
        tokenFilter: jest.fn(),
        isConversionToken: jest.fn(),
      });

      const { getByText } = renderWithProvider(<MusdConversionCta />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByText('Get mUSD'));
      });

      await waitFor(() => {
        expect(mockInitiateConversion).toHaveBeenCalledWith({
          outputChainId: '0x1',
          preferredPaymentToken: {
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            chainId: '0x1',
          },
        });
      });
    });

    it('does not call goToBuy when tokens available', async () => {
      (
        useMusdConversionTokens as jest.MockedFunction<
          typeof useMusdConversionTokens
        >
      ).mockReturnValue({
        tokens: [mockToken],
        tokenFilter: jest.fn(),
        isConversionToken: jest.fn(),
      });

      const { getByText } = renderWithProvider(<MusdConversionCta />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByText('Get mUSD'));
      });

      await waitFor(() => {
        expect(mockGoToBuy).not.toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      (
        useMusdConversionTokens as jest.MockedFunction<
          typeof useMusdConversionTokens
        >
      ).mockReturnValue({
        tokens: [mockToken],
        tokenFilter: jest.fn(),
        isConversionToken: jest.fn(),
      });
    });

    it('logs error when initiateConversion fails with Error instance', async () => {
      const testError = new Error('Network error');
      mockInitiateConversion.mockRejectedValue(testError);

      const { getByText } = renderWithProvider(<MusdConversionCta />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByText('Get mUSD'));
      });

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          testError,
          '[mUSD Conversion] Failed to initiate conversion from CTA',
        );
      });
    });

    it('logs error when initiateConversion fails with non-Error value', async () => {
      const nonErrorValue = 'string error';
      mockInitiateConversion.mockRejectedValue(nonErrorValue);

      const { getByText } = renderWithProvider(<MusdConversionCta />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByText('Get mUSD'));
      });

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          nonErrorValue,
          '[mUSD Conversion] Failed to initiate conversion from CTA',
        );
      });
    });
  });
});
