import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('../../../hooks/useMusdConversionFlowData');
jest.mock('../../../hooks/useMusdConversion');
jest.mock('../../../hooks/useMusdCtaVisibility');
jest.mock('../../../../Ramp/hooks/useRampNavigation');
jest.mock('../../../../../../util/Logger');
jest.mock('../../../../../hooks/useMetrics');
jest.mock('../../../../../Views/confirmations/hooks/useNetworkName');

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import MusdConversionAssetListCta from '.';
import { useMusdConversionFlowData } from '../../../hooks/useMusdConversionFlowData';
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
import { useMetrics, MetaMetricsEvents } from '../../../../../hooks/useMetrics';
import { useNetworkName } from '../../../../../Views/confirmations/hooks/useNetworkName';
import { MUSD_EVENTS_CONSTANTS } from '../../../constants/events';
import { Hex } from '@metamask/utils';

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

describe('MusdConversionAssetListCta', () => {
  const FIXED_NOW_MS = 1730000000000;
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();
  const mockAddProperties = jest.fn();
  const mockBuild = jest.fn();

  const mockGoToBuy = jest.fn();
  const mockInitiateConversion = jest.fn();
  const mockLoggerError = jest.spyOn(Logger, 'error');

  const mockGetPreferredPaymentToken = jest.fn();
  const mockGetChainIdForBuyFlow = jest.fn();
  const mockGetMusdOutputChainId = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW_MS);

    mockBuild.mockReturnValue({ name: 'mock-built-event' });
    mockAddProperties.mockImplementation(() => ({ build: mockBuild }));
    mockCreateEventBuilder.mockImplementation(() => ({
      addProperties: mockAddProperties,
    }));

    (useMetrics as jest.MockedFunction<typeof useMetrics>).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as unknown as ReturnType<typeof useMetrics>);

    (
      useNetworkName as jest.MockedFunction<typeof useNetworkName>
    ).mockReturnValue('Ethereum Mainnet');

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

    // Setup default mock for useMusdConversionFlowData
    mockGetPreferredPaymentToken.mockReturnValue({
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      chainId: '0x1',
    });
    mockGetChainIdForBuyFlow.mockReturnValue(MUSD_CONVERSION_DEFAULT_CHAIN_ID);
    mockGetMusdOutputChainId.mockReturnValue('0x1' as Hex);

    (
      useMusdConversionFlowData as jest.MockedFunction<
        typeof useMusdConversionFlowData
      >
    ).mockReturnValue({
      isEmptyWallet: false,
      getPaymentTokenForSelectedNetwork: mockGetPreferredPaymentToken,
      getChainIdForBuyFlow: mockGetChainIdForBuyFlow,
      isPopularNetworksFilterActive: false,
      selectedChainId: null,
      selectedChains: [],
      isGeoEligible: true,
      hasConvertibleTokens: true,
      conversionTokens: [mockConversionToken],
      isMusdBuyableOnChain: {},
      isMusdBuyableOnAnyChain: false,
      isMusdBuyable: false,
    });

    // Default mock for visibility - show CTA with non-empty wallet
    (
      useMusdCtaVisibility as jest.MockedFunction<typeof useMusdCtaVisibility>
    ).mockReturnValue({
      shouldShowBuyGetMusdCta: jest.fn().mockReturnValue({
        shouldShowCta: true,
        showNetworkIcon: false,
        selectedChainId: null,
        isEmptyWallet: false,
      }),
      shouldShowTokenListItemCta: jest.fn(),
      shouldShowAssetOverviewCta: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders component with container testID when hook returns shouldShowCta true', () => {
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
      const { getByText } = renderWithProvider(<MusdConversionAssetListCta />, {
        state: initialRootState,
      });

      expect(getByText('MetaMask USD')).toBeOnTheScreen();
    });

    it('displays earn percentage text', () => {
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
    it('displays "Buy mUSD" when hook returns isEmptyWallet true', () => {
      (
        useMusdConversionFlowData as jest.MockedFunction<
          typeof useMusdConversionFlowData
        >
      ).mockReturnValue({
        isEmptyWallet: true,
        getPaymentTokenForSelectedNetwork: mockGetPreferredPaymentToken,
        getChainIdForBuyFlow: mockGetChainIdForBuyFlow,
        isPopularNetworksFilterActive: false,
        selectedChainId: null,
        selectedChains: [],
        isGeoEligible: true,
        hasConvertibleTokens: false,
        conversionTokens: [],
        isMusdBuyableOnChain: {},
        isMusdBuyableOnAnyChain: false,
        isMusdBuyable: false,
      });

      const { getByText } = renderWithProvider(<MusdConversionAssetListCta />, {
        state: initialRootState,
      });

      expect(getByText('Buy mUSD')).toBeOnTheScreen();
    });

    it('displays "Get mUSD" when hook returns isEmptyWallet false', () => {
      const { getByText } = renderWithProvider(<MusdConversionAssetListCta />, {
        state: initialRootState,
      });

      expect(getByText('Get mUSD')).toBeOnTheScreen();
    });

    it('hides CTA when hook returns shouldShowCta false', () => {
      (
        useMusdCtaVisibility as jest.MockedFunction<typeof useMusdCtaVisibility>
      ).mockReturnValue({
        shouldShowBuyGetMusdCta: jest.fn().mockReturnValue({
          shouldShowCta: false,
          showNetworkIcon: false,
          selectedChainId: null,
          isEmptyWallet: false,
        }),
        shouldShowTokenListItemCta: jest.fn(),
        shouldShowAssetOverviewCta: jest.fn(),
      });

      const { queryByTestId } = renderWithProvider(
        <MusdConversionAssetListCta />,
        {
          state: initialRootState,
        },
      );

      expect(
        queryByTestId(EARN_TEST_IDS.MUSD.ASSET_LIST_CONVERSION_CTA),
      ).toBeNull();
    });
  });

  describe('button press - empty wallet', () => {
    beforeEach(() => {
      // Set hook to return empty wallet state
      (
        useMusdConversionFlowData as jest.MockedFunction<
          typeof useMusdConversionFlowData
        >
      ).mockReturnValue({
        isEmptyWallet: true,
        getPaymentTokenForSelectedNetwork: mockGetPreferredPaymentToken,
        getChainIdForBuyFlow: mockGetChainIdForBuyFlow,
        isPopularNetworksFilterActive: false,
        selectedChainId: null,
        selectedChains: [],
        isGeoEligible: true,
        hasConvertibleTokens: false,
        conversionTokens: [],
        isMusdBuyableOnChain: {},
        isMusdBuyableOnAnyChain: false,
        isMusdBuyable: false,
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

    it('does not call initiateConversion when wallet is empty', () => {
      const { getByText } = renderWithProvider(<MusdConversionAssetListCta />, {
        state: initialRootState,
      });

      fireEvent.press(getByText('Buy mUSD'));

      expect(mockInitiateConversion).not.toHaveBeenCalled();
    });
  });

  describe('button press - with tokens', () => {
    it('calls initiateConversion with correct parameters', async () => {
      const { getByText } = renderWithProvider(<MusdConversionAssetListCta />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByText('Get mUSD'));
      });

      await waitFor(() => {
        expect(mockInitiateConversion).toHaveBeenCalledWith({
          preferredPaymentToken: {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            chainId: '0x1',
          },
        });
      });
    });

    it('uses payment token from selected chain when available', async () => {
      const lineaToken = {
        address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        chainId: CHAIN_IDS.LINEA_MAINNET,
      };

      mockGetPreferredPaymentToken.mockReturnValue(lineaToken);
      mockGetMusdOutputChainId.mockReturnValue(lineaToken.chainId);

      (
        useMusdConversionFlowData as jest.MockedFunction<
          typeof useMusdConversionFlowData
        >
      ).mockReturnValue({
        isEmptyWallet: false,
        getPaymentTokenForSelectedNetwork: mockGetPreferredPaymentToken,
        getChainIdForBuyFlow: mockGetChainIdForBuyFlow,
        isPopularNetworksFilterActive: false,
        selectedChainId: CHAIN_IDS.LINEA_MAINNET,
        selectedChains: [CHAIN_IDS.LINEA_MAINNET],
        isGeoEligible: true,
        hasConvertibleTokens: true,
        conversionTokens: [{ ...mockConversionToken, ...lineaToken }],
        isMusdBuyableOnChain: {},
        isMusdBuyableOnAnyChain: false,
        isMusdBuyable: false,
      });

      (
        useMusdCtaVisibility as jest.MockedFunction<typeof useMusdCtaVisibility>
      ).mockReturnValue({
        shouldShowBuyGetMusdCta: jest.fn().mockReturnValue({
          shouldShowCta: true,
          showNetworkIcon: false,
          selectedChainId: CHAIN_IDS.LINEA_MAINNET,
        }),
        shouldShowTokenListItemCta: jest.fn(),
        shouldShowAssetOverviewCta: jest.fn(),
      });

      const { getByText } = renderWithProvider(<MusdConversionAssetListCta />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByText('Get mUSD'));
      });

      await waitFor(() => {
        expect(mockInitiateConversion).toHaveBeenCalledWith({
          preferredPaymentToken: lineaToken,
        });
      });
    });

    it('Get mUSD falls back to first token when selected chain has no token', async () => {
      const firstToken = {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        chainId: CHAIN_IDS.MAINNET,
      };

      mockGetPreferredPaymentToken.mockReturnValue(firstToken);
      mockGetMusdOutputChainId.mockReturnValue(firstToken.chainId);

      (
        useMusdConversionFlowData as jest.MockedFunction<
          typeof useMusdConversionFlowData
        >
      ).mockReturnValue({
        isEmptyWallet: false,
        getPaymentTokenForSelectedNetwork: mockGetPreferredPaymentToken,
        getChainIdForBuyFlow: mockGetChainIdForBuyFlow,
        isPopularNetworksFilterActive: false,
        selectedChainId: CHAIN_IDS.LINEA_MAINNET,
        selectedChains: [CHAIN_IDS.LINEA_MAINNET],
        isGeoEligible: true,
        hasConvertibleTokens: true,
        conversionTokens: [{ ...mockConversionToken, ...firstToken }],
        isMusdBuyableOnChain: {},
        isMusdBuyableOnAnyChain: false,
        isMusdBuyable: false,
      });

      (
        useMusdCtaVisibility as jest.MockedFunction<typeof useMusdCtaVisibility>
      ).mockReturnValue({
        shouldShowBuyGetMusdCta: jest.fn().mockReturnValue({
          shouldShowCta: true,
          showNetworkIcon: false,
          selectedChainId: CHAIN_IDS.LINEA_MAINNET,
        }),
        shouldShowTokenListItemCta: jest.fn(),
        shouldShowAssetOverviewCta: jest.fn(),
      });

      const { getByText } = renderWithProvider(<MusdConversionAssetListCta />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByText('Get mUSD'));
      });

      await waitFor(() => {
        expect(mockInitiateConversion).toHaveBeenCalledWith({
          preferredPaymentToken: firstToken,
        });
      });
    });

    it('uses first token from array when multiple tokens available', async () => {
      const { getByText } = renderWithProvider(<MusdConversionAssetListCta />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByText('Get mUSD'));
      });

      await waitFor(() => {
        expect(mockInitiateConversion).toHaveBeenCalledWith({
          preferredPaymentToken: {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            chainId: '0x1',
          },
        });
      });
    });

    it('does not call goToAggregator when tokens available', async () => {
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
    it('renders null when shouldShowCta is false', () => {
      (
        useMusdCtaVisibility as jest.MockedFunction<typeof useMusdCtaVisibility>
      ).mockReturnValue({
        shouldShowBuyGetMusdCta: jest.fn().mockReturnValue({
          shouldShowCta: false,
          showNetworkIcon: false,
          selectedChainId: null,
          isEmptyWallet: false,
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
          isEmptyWallet: true,
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
    it('renders without network badge when showNetworkIcon is false', () => {
      (
        useMusdCtaVisibility as jest.MockedFunction<typeof useMusdCtaVisibility>
      ).mockReturnValue({
        shouldShowBuyGetMusdCta: jest.fn().mockReturnValue({
          shouldShowCta: true,
          showNetworkIcon: false,
          selectedChainId: null,
          isEmptyWallet: true,
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
          isEmptyWallet: true,
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
          isEmptyWallet: true,
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
          isEmptyWallet: true,
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

  describe('MetaMetrics', () => {
    const { EVENT_LOCATIONS, MUSD_CTA_TYPES } = MUSD_EVENTS_CONSTANTS;

    it('tracks mUSD conversion CTA clicked event when Buy mUSD is pressed', () => {
      // Arrange
      (
        useMusdConversionFlowData as jest.MockedFunction<
          typeof useMusdConversionFlowData
        >
      ).mockReturnValue({
        isEmptyWallet: true,
        getPaymentTokenForSelectedNetwork: mockGetPreferredPaymentToken,
        getChainIdForBuyFlow: mockGetChainIdForBuyFlow,
        isPopularNetworksFilterActive: false,
        selectedChainId: null,
        selectedChains: [],
        isGeoEligible: true,
        hasConvertibleTokens: false,
        conversionTokens: [],
        isMusdBuyableOnChain: {},
        isMusdBuyableOnAnyChain: false,
        isMusdBuyable: false,
      });

      (
        useMusdCtaVisibility as jest.MockedFunction<typeof useMusdCtaVisibility>
      ).mockReturnValue({
        shouldShowBuyGetMusdCta: jest.fn().mockReturnValue({
          shouldShowCta: true,
          showNetworkIcon: false,
          selectedChainId: null,
          isEmptyWallet: true,
        }),
        shouldShowTokenListItemCta: jest.fn(),
        shouldShowAssetOverviewCta: jest.fn(),
      });

      const { getByText } = renderWithProvider(<MusdConversionAssetListCta />, {
        state: initialRootState,
      });

      // Act
      fireEvent.press(getByText(strings('earn.musd_conversion.buy_musd')));

      // Assert
      expect(mockCreateEventBuilder).toHaveBeenCalledTimes(1);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MUSD_CONVERSION_CTA_CLICKED,
      );

      expect(mockAddProperties).toHaveBeenCalledTimes(1);
      expect(mockAddProperties).toHaveBeenCalledWith({
        location: EVENT_LOCATIONS.HOME_SCREEN,
        redirects_to: EVENT_LOCATIONS.BUY_SCREEN,
        cta_type: MUSD_CTA_TYPES.PRIMARY,
        cta_text: strings('earn.musd_conversion.buy_musd'),
        network_chain_id: MUSD_CONVERSION_DEFAULT_CHAIN_ID,
        network_name: 'Ethereum Mainnet',
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'mock-built-event' });
    });

    // TODO: Missing test case: tracks mUSD conversion CTA clicked event when Get mUSD is pressed and education screen already seen
    it('tracks mUSD conversion CTA clicked event when Get mUSD is pressed and education screen has not been seen', async () => {
      // Arrange
      (
        useMusdConversion as jest.MockedFunction<typeof useMusdConversion>
      ).mockReturnValue({
        initiateConversion: mockInitiateConversion,
        error: null,
        hasSeenConversionEducationScreen: false,
      });

      const { getByText } = renderWithProvider(<MusdConversionAssetListCta />, {
        state: initialRootState,
      });

      // Act
      await act(async () => {
        fireEvent.press(getByText(strings('earn.musd_conversion.get_musd')));
      });

      // Assert
      expect(mockCreateEventBuilder).toHaveBeenCalledTimes(1);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MUSD_CONVERSION_CTA_CLICKED,
      );

      expect(mockAddProperties).toHaveBeenCalledTimes(1);
      expect(mockAddProperties).toHaveBeenCalledWith({
        location: EVENT_LOCATIONS.HOME_SCREEN,
        redirects_to: EVENT_LOCATIONS.CONVERSION_EDUCATION_SCREEN,
        cta_type: MUSD_CTA_TYPES.PRIMARY,
        cta_text: strings('earn.musd_conversion.get_musd'),
        network_chain_id: MUSD_CONVERSION_DEFAULT_CHAIN_ID,
        network_name: 'Ethereum Mainnet',
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'mock-built-event' });
    });

    it('tracks mUSD conversion CTA clicked event when Get mUSD is pressed and education screen has been seen', async () => {
      // Arrange
      (
        useMusdConversion as jest.MockedFunction<typeof useMusdConversion>
      ).mockReturnValue({
        initiateConversion: mockInitiateConversion,
        error: null,
        hasSeenConversionEducationScreen: true,
      });

      const { getByText } = renderWithProvider(<MusdConversionAssetListCta />, {
        state: initialRootState,
      });

      // Act
      await act(async () => {
        fireEvent.press(getByText(strings('earn.musd_conversion.get_musd')));
      });

      // Assert
      expect(mockCreateEventBuilder).toHaveBeenCalledTimes(1);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MUSD_CONVERSION_CTA_CLICKED,
      );

      expect(mockAddProperties).toHaveBeenCalledTimes(1);
      expect(mockAddProperties).toHaveBeenCalledWith({
        location: EVENT_LOCATIONS.HOME_SCREEN,
        redirects_to: EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN,
        cta_type: MUSD_CTA_TYPES.PRIMARY,
        cta_text: strings('earn.musd_conversion.get_musd'),
        network_chain_id: MUSD_CONVERSION_DEFAULT_CHAIN_ID,
        network_name: 'Ethereum Mainnet',
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'mock-built-event' });
    });
  });
});
