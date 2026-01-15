import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';

jest.mock('../../../hooks/useMusdConversionTokens');
jest.mock('../../../hooks/useMusdConversion');
jest.mock('../../../hooks/useMusdCtaVisibility');
jest.mock('../../../../Ramp/hooks/useRampNavigation');
jest.mock('../../../../../../util/Logger');

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import MusdConversionAssetListCta from '.';
import { useMusdConversionTokens } from '../../../hooks/useMusdConversionTokens';
import { useMusdConversion } from '../../../hooks/useMusdConversion';
import { useMusdCtaVisibility } from '../../../hooks/useMusdCtaVisibility';
import { useRampNavigation } from '../../../../Ramp/hooks/useRampNavigation';
import {
  MUSD_CONVERSION_APY,
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../../../constants/musd';
import { EARN_TEST_IDS } from '../../../constants/testIds';
import initialRootState from '../../../../../../util/test/initial-root-state';
import Logger from '../../../../../../util/Logger';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { BADGE_WRAPPER_BADGE_TEST_ID } from '../../../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.constants';
import { strings } from '../../../../../../../locales/i18n';

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

describe('MusdConversionAssetListCta', () => {
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

    // Default mock for visibility - show CTA without network icon
    (
      useMusdCtaVisibility as jest.MockedFunction<typeof useMusdCtaVisibility>
    ).mockReturnValue({
      shouldShowBuyGetMusdCta: jest.fn().mockReturnValue({
        shouldShowCta: true,
        showNetworkIcon: false,
        selectedChainId: null,
      }),
      shouldShowTokenListItemCta: jest.fn(),
      shouldShowAssetOverviewCta: jest.fn(),
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
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
        getMusdOutputChainId: jest.fn((chainId) => (chainId ?? '0x1') as Hex),
      });

      const { getByTestId } = renderWithProvider(
        <MusdConversionAssetListCta />,
        {
          state: initialRootState,
        },
      );

      expect(
        getByTestId(EARN_TEST_IDS.MUSD.ASSET_LIST_CONVERSION_CTA),
      ).toBeOnTheScreen();
    });

    it('displays MetaMask USD text', () => {
      (
        useMusdConversionTokens as jest.MockedFunction<
          typeof useMusdConversionTokens
        >
      ).mockReturnValue({
        tokens: [],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
        getMusdOutputChainId: jest.fn((chainId) => (chainId ?? '0x1') as Hex),
      });

      const { getByText } = renderWithProvider(<MusdConversionAssetListCta />, {
        state: initialRootState,
      });

      expect(getByText('MetaMask USD')).toBeOnTheScreen();
    });

    it('displays earn percentage text', () => {
      (
        useMusdConversionTokens as jest.MockedFunction<
          typeof useMusdConversionTokens
        >
      ).mockReturnValue({
        tokens: [],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
        getMusdOutputChainId: jest.fn((chainId) => (chainId ?? '0x1') as Hex),
      });

      const { getByText } = renderWithProvider(<MusdConversionAssetListCta />, {
        state: initialRootState,
      });

      expect(
        getByText(
          strings('earn.earn_a_percentage_bonus', {
            percentage: MUSD_CONVERSION_APY,
          }),
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('CTA button text', () => {
    it('displays "Buy mUSD" when no tokens available', () => {
      (
        useMusdConversionTokens as jest.MockedFunction<
          typeof useMusdConversionTokens
        >
      ).mockReturnValue({
        tokens: [],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
        getMusdOutputChainId: jest.fn((chainId) => (chainId ?? '0x1') as Hex),
      });

      const { getByText } = renderWithProvider(<MusdConversionAssetListCta />, {
        state: initialRootState,
      });

      expect(getByText('Buy mUSD')).toBeOnTheScreen();
    });

    it('displays "Get mUSD" when tokens available', () => {
      (
        useMusdConversionTokens as jest.MockedFunction<
          typeof useMusdConversionTokens
        >
      ).mockReturnValue({
        tokens: [mockToken],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
        getMusdOutputChainId: jest.fn((chainId) => (chainId ?? '0x1') as Hex),
      });

      const { getByText } = renderWithProvider(<MusdConversionAssetListCta />, {
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
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
        getMusdOutputChainId: jest.fn((chainId) => (chainId ?? '0x1') as Hex),
      });
    });

    it('calls goToBuy with correct ramp intent', () => {
      const { getByText } = renderWithProvider(<MusdConversionAssetListCta />, {
        state: initialRootState,
      });

      fireEvent.press(getByText('Buy mUSD'));

      expect(mockGoToBuy).toHaveBeenCalledWith({
        assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[MUSD_CONVERSION_DEFAULT_CHAIN_ID],
      });
    });

    it('does not call initiateConversion when no tokens', () => {
      const { getByText } = renderWithProvider(<MusdConversionAssetListCta />, {
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
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
        getMusdOutputChainId: jest.fn((chainId) => (chainId ?? '0x1') as Hex),
      });

      const { getByText } = renderWithProvider(<MusdConversionAssetListCta />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByText('Get mUSD'));
      });

      await waitFor(() => {
        expect(mockInitiateConversion).toHaveBeenCalledWith({
          outputChainId: '0x1',
          preferredPaymentToken: {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
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
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
        getMusdOutputChainId: jest.fn((chainId) => (chainId ?? '0x1') as Hex),
      });

      const { getByText } = renderWithProvider(<MusdConversionAssetListCta />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByText('Get mUSD'));
      });

      await waitFor(() => {
        expect(mockInitiateConversion).toHaveBeenCalledWith({
          outputChainId: '0x1',
          preferredPaymentToken: {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
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
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
        getMusdOutputChainId: jest.fn((chainId) => (chainId ?? '0x1') as Hex),
      });

      const { getByText } = renderWithProvider(<MusdConversionAssetListCta />, {
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
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
        getMusdOutputChainId: jest.fn((chainId) => (chainId ?? '0x1') as Hex),
      });
    });

    it('logs error when initiateConversion fails with Error instance', async () => {
      const testError = new Error('Network error');
      mockInitiateConversion.mockRejectedValue(testError);

      const { getByText } = renderWithProvider(<MusdConversionAssetListCta />, {
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

      const { getByText } = renderWithProvider(<MusdConversionAssetListCta />, {
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

  describe('visibility behavior', () => {
    beforeEach(() => {
      (
        useMusdConversionTokens as jest.MockedFunction<
          typeof useMusdConversionTokens
        >
      ).mockReturnValue({
        tokens: [],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
        getMusdOutputChainId: jest.fn((chainId) => (chainId ?? '0x1') as Hex),
      });
    });

    it('renders null when shouldShowCta is false', () => {
      (
        useMusdCtaVisibility as jest.MockedFunction<typeof useMusdCtaVisibility>
      ).mockReturnValue({
        shouldShowBuyGetMusdCta: jest.fn().mockReturnValue({
          shouldShowCta: false,
          showNetworkIcon: false,
          selectedChainId: null,
        }),
        shouldShowTokenListItemCta: jest.fn(),
        shouldShowAssetOverviewCta: jest.fn(),
      });

      const { queryByTestId } = renderWithProvider(
        <MusdConversionAssetListCta />,
        { state: initialRootState },
      );

      expect(
        queryByTestId(EARN_TEST_IDS.MUSD.ASSET_LIST_CONVERSION_CTA),
      ).toBeNull();
    });

    it('renders component when shouldShowCta is true', () => {
      (
        useMusdCtaVisibility as jest.MockedFunction<typeof useMusdCtaVisibility>
      ).mockReturnValue({
        shouldShowBuyGetMusdCta: jest.fn().mockReturnValue({
          shouldShowCta: true,
          showNetworkIcon: false,
          selectedChainId: null,
        }),
        shouldShowTokenListItemCta: jest.fn(),
        shouldShowAssetOverviewCta: jest.fn(),
      });

      const { getByTestId } = renderWithProvider(
        <MusdConversionAssetListCta />,
        { state: initialRootState },
      );

      expect(
        getByTestId(EARN_TEST_IDS.MUSD.ASSET_LIST_CONVERSION_CTA),
      ).toBeOnTheScreen();
    });
  });

  describe('network badge', () => {
    beforeEach(() => {
      (
        useMusdConversionTokens as jest.MockedFunction<
          typeof useMusdConversionTokens
        >
      ).mockReturnValue({
        tokens: [],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
        getMusdOutputChainId: jest.fn((chainId) => (chainId ?? '0x1') as Hex),
      });
    });

    it('renders without network badge when showNetworkIcon is false', () => {
      (
        useMusdCtaVisibility as jest.MockedFunction<typeof useMusdCtaVisibility>
      ).mockReturnValue({
        shouldShowBuyGetMusdCta: jest.fn().mockReturnValue({
          shouldShowCta: true,
          showNetworkIcon: false,
          selectedChainId: null,
        }),
        shouldShowTokenListItemCta: jest.fn(),
        shouldShowAssetOverviewCta: jest.fn(),
      });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <MusdConversionAssetListCta />,
        { state: initialRootState },
      );

      expect(
        getByTestId(EARN_TEST_IDS.MUSD.ASSET_LIST_CONVERSION_CTA),
      ).toBeOnTheScreen();
      // Badge wrapper is not rendered when showNetworkIcon is false
      expect(queryByTestId(BADGE_WRAPPER_BADGE_TEST_ID)).toBeNull();
    });

    it('renders with network badge when showNetworkIcon is true and mainnet selected', () => {
      (
        useMusdCtaVisibility as jest.MockedFunction<typeof useMusdCtaVisibility>
      ).mockReturnValue({
        shouldShowBuyGetMusdCta: jest.fn().mockReturnValue({
          shouldShowCta: true,
          showNetworkIcon: true,
          selectedChainId: CHAIN_IDS.MAINNET,
        }),
        shouldShowTokenListItemCta: jest.fn(),
        shouldShowAssetOverviewCta: jest.fn(),
      });

      const { getByTestId } = renderWithProvider(
        <MusdConversionAssetListCta />,
        { state: initialRootState },
      );

      expect(
        getByTestId(EARN_TEST_IDS.MUSD.ASSET_LIST_CONVERSION_CTA),
      ).toBeOnTheScreen();
    });

    it('renders with network badge when showNetworkIcon is true and Linea selected', () => {
      (
        useMusdCtaVisibility as jest.MockedFunction<typeof useMusdCtaVisibility>
      ).mockReturnValue({
        shouldShowBuyGetMusdCta: jest.fn().mockReturnValue({
          shouldShowCta: true,
          showNetworkIcon: true,
          selectedChainId: CHAIN_IDS.LINEA_MAINNET,
        }),
        shouldShowTokenListItemCta: jest.fn(),
        shouldShowAssetOverviewCta: jest.fn(),
      });

      const { getByTestId } = renderWithProvider(
        <MusdConversionAssetListCta />,
        { state: initialRootState },
      );

      expect(
        getByTestId(EARN_TEST_IDS.MUSD.ASSET_LIST_CONVERSION_CTA),
      ).toBeOnTheScreen();
    });

    it('renders with network badge when showNetworkIcon is true and BSC selected', () => {
      (
        useMusdCtaVisibility as jest.MockedFunction<typeof useMusdCtaVisibility>
      ).mockReturnValue({
        shouldShowBuyGetMusdCta: jest.fn().mockReturnValue({
          shouldShowCta: true,
          showNetworkIcon: true,
          selectedChainId: CHAIN_IDS.BSC,
        }),
        shouldShowTokenListItemCta: jest.fn(),
        shouldShowAssetOverviewCta: jest.fn(),
      });

      const { getByTestId } = renderWithProvider(
        <MusdConversionAssetListCta />,
        { state: initialRootState },
      );

      expect(
        getByTestId(EARN_TEST_IDS.MUSD.ASSET_LIST_CONVERSION_CTA),
      ).toBeOnTheScreen();
    });
  });
});
