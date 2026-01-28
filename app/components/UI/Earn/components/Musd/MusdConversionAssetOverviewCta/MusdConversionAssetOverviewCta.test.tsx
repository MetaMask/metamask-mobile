import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import MusdConversionAssetOverviewCta from '.';
import { useMusdConversion } from '../../../hooks/useMusdConversion';
import { useMusdConversionTokens } from '../../../hooks/useMusdConversionTokens';
import { EARN_TEST_IDS } from '../../../constants/testIds';
import initialRootState from '../../../../../../util/test/initial-root-state';
import Logger from '../../../../../../util/Logger';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenI } from '../../../../Tokens/types';

jest.mock('../../../hooks/useMusdConversion');
jest.mock('../../../../../../util/Logger');
jest.mock('../../../hooks/useMusdConversionTokens');
jest.mock('../../../../../hooks/useMetrics');
jest.mock('../../../../../Views/confirmations/hooks/useNetworkName');

import { useMetrics, MetaMetricsEvents } from '../../../../../hooks/useMetrics';
import { useNetworkName } from '../../../../../Views/confirmations/hooks/useNetworkName';
import { MUSD_EVENTS_CONSTANTS } from '../../../constants/events';
import { strings } from '../../../../../../../locales/i18n';
import { MUSD_CONVERSION_APY } from '../../../constants/musd';

const createMockToken = (overrides: Partial<TokenI> = {}): TokenI => ({
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
  ...overrides,
});

describe('MusdConversionAssetOverviewCta', () => {
  const FIXED_NOW_MS = 1730000000000;
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();
  const mockAddProperties = jest.fn();
  const mockBuild = jest.fn();

  const mockInitiateConversion = jest.fn();
  const mockLoggerError = jest.mocked(Logger.error);

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

    jest.mocked(useMusdConversion).mockReturnValue({
      initiateConversion: mockInitiateConversion,
      error: null,
      hasSeenConversionEducationScreen: true,
    });

    jest.mocked(useMusdConversionTokens).mockReturnValue({
      isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
      isConversionToken: jest.fn().mockReturnValue(false),
      tokens: [],
      filterAllowedTokens: jest.fn(),
      getMusdOutputChainId: jest
        .fn()
        .mockImplementation((chainId) => chainId || CHAIN_IDS.MAINNET),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders container with default testID', () => {
      const mockToken = createMockToken();

      const { getByTestId } = renderWithProvider(
        <MusdConversionAssetOverviewCta asset={mockToken} />,
        { state: initialRootState },
      );

      expect(
        getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
      ).toBeOnTheScreen();
    });

    it('renders container with custom testID', () => {
      const mockToken = createMockToken();
      const customTestId = 'custom-test-id';

      const { getByTestId } = renderWithProvider(
        <MusdConversionAssetOverviewCta
          asset={mockToken}
          testId={customTestId}
        />,
        { state: initialRootState },
      );

      expect(getByTestId(customTestId)).toBeOnTheScreen();
    });

    it('displays CTA text correctly', () => {
      const mockToken = createMockToken();

      const { getByText } = renderWithProvider(
        <MusdConversionAssetOverviewCta asset={mockToken} />,
        { state: initialRootState },
      );

      expect(
        getByText(`Get ${MUSD_CONVERSION_APY}% on your stablecoins`),
      ).toBeOnTheScreen();
      expect(
        getByText(
          `Convert your stablecoins to mUSD and receive up to a ${MUSD_CONVERSION_APY}% bonus.`,
        ),
      ).toBeOnTheScreen();
    });

    it('renders close button when onDismiss is provided', () => {
      const mockToken = createMockToken();
      const mockOnDismiss = jest.fn();

      const { getByTestId } = renderWithProvider(
        <MusdConversionAssetOverviewCta
          asset={mockToken}
          onDismiss={mockOnDismiss}
        />,
        { state: initialRootState },
      );

      expect(
        getByTestId(
          EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA_CLOSE_BUTTON,
        ),
      ).toBeOnTheScreen();
    });

    it('does not render close button when onDismiss is not provided', () => {
      const mockToken = createMockToken();

      const { queryByTestId } = renderWithProvider(
        <MusdConversionAssetOverviewCta asset={mockToken} />,
        { state: initialRootState },
      );

      expect(
        queryByTestId(
          EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA_CLOSE_BUTTON,
        ),
      ).toBeNull();
    });

    it('calls onDismiss when close button is pressed', () => {
      const mockToken = createMockToken();
      const mockOnDismiss = jest.fn();

      const { getByTestId } = renderWithProvider(
        <MusdConversionAssetOverviewCta
          asset={mockToken}
          onDismiss={mockOnDismiss}
        />,
        { state: initialRootState },
      );

      fireEvent.press(
        getByTestId(
          EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA_CLOSE_BUTTON,
        ),
      );

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('press handler - conversion path', () => {
    beforeEach(() => {
      jest.mocked(useMusdConversion).mockReturnValue({
        initiateConversion: mockInitiateConversion,
        error: null,
        hasSeenConversionEducationScreen: true,
      });
    });

    it('calls initiateConversion when user has seen education screen', async () => {
      const mockToken = createMockToken();

      const { getByTestId } = renderWithProvider(
        <MusdConversionAssetOverviewCta asset={mockToken} />,
        { state: initialRootState },
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
        );
      });

      await waitFor(() => {
        expect(mockInitiateConversion).toHaveBeenCalledTimes(1);
      });
    });

    it('passes correct config to initiateConversion', async () => {
      const mockToken = createMockToken({
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: '0x1',
      });

      const { getByTestId } = renderWithProvider(
        <MusdConversionAssetOverviewCta asset={mockToken} />,
        { state: initialRootState },
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
        );
      });

      await waitFor(() => {
        expect(mockInitiateConversion).toHaveBeenCalledWith({
          outputChainId: CHAIN_IDS.MAINNET,
          preferredPaymentToken: {
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            chainId: '0x1',
          },
          navigationStack: Routes.EARN.ROOT,
        });
      });
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      jest.mocked(useMusdConversion).mockReturnValue({
        initiateConversion: mockInitiateConversion,
        error: null,
        hasSeenConversionEducationScreen: true,
      });
    });

    it('logs error when asset address is missing', async () => {
      const mockToken = createMockToken({ address: '' });

      const { getByTestId } = renderWithProvider(
        <MusdConversionAssetOverviewCta asset={mockToken} />,
        { state: initialRootState },
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
        );
      });

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          expect.any(Error),
          '[mUSD Conversion] Failed to initiate conversion from asset overview CTA',
        );
      });

      expect(mockInitiateConversion).not.toHaveBeenCalled();
    });

    it('logs error with correct message when asset address is missing', async () => {
      const mockToken = createMockToken({ address: '' });

      const { getByTestId } = renderWithProvider(
        <MusdConversionAssetOverviewCta asset={mockToken} />,
        { state: initialRootState },
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
        );
      });

      await waitFor(() => {
        const errorArg = mockLoggerError.mock.calls[0][0] as Error;
        expect(errorArg.message).toBe('Asset address or chain ID is not set');
      });
    });

    it('logs error when asset chainId is missing', async () => {
      const mockToken = createMockToken({ chainId: '' });

      const { getByTestId } = renderWithProvider(
        <MusdConversionAssetOverviewCta asset={mockToken} />,
        { state: initialRootState },
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
        );
      });

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          expect.any(Error),
          '[mUSD Conversion] Failed to initiate conversion from asset overview CTA',
        );
      });

      expect(mockInitiateConversion).not.toHaveBeenCalled();
    });

    it('logs error when asset chainId is undefined', async () => {
      const mockToken = createMockToken({ chainId: undefined });

      const { getByTestId } = renderWithProvider(
        <MusdConversionAssetOverviewCta asset={mockToken} />,
        { state: initialRootState },
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
        );
      });

      await waitFor(() => {
        const errorArg = mockLoggerError.mock.calls[0][0] as Error;
        expect(errorArg.message).toBe('Asset address or chain ID is not set');
      });
    });

    it('logs error when initiateConversion fails with Error instance', async () => {
      const testError = new Error('Conversion failed');
      mockInitiateConversion.mockRejectedValue(testError);

      const mockToken = createMockToken();

      const { getByTestId } = renderWithProvider(
        <MusdConversionAssetOverviewCta asset={mockToken} />,
        { state: initialRootState },
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
        );
      });

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          testError,
          '[mUSD Conversion] Failed to initiate conversion from asset overview CTA',
        );
      });
    });
  });

  describe('MetaMetrics', () => {
    const { EVENT_LOCATIONS, MUSD_CTA_TYPES } = MUSD_EVENTS_CONSTANTS;

    it('tracks mUSD conversion CTA clicked event when user has not seen education screen', async () => {
      // Arrange
      jest.mocked(useMusdConversion).mockReturnValue({
        initiateConversion: mockInitiateConversion,
        error: null,
        hasSeenConversionEducationScreen: false,
      });

      const asset = createMockToken();

      const { getByTestId } = renderWithProvider(
        <MusdConversionAssetOverviewCta asset={asset} />,
        { state: initialRootState },
      );

      // Act
      await act(async () => {
        fireEvent.press(
          getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
        );
      });

      // Assert
      const expectedCtaText = `${strings('earn.musd_conversion.earn_rewards_when')} ${strings('earn.musd_conversion.you_convert_to')} mUSD`;

      expect(mockCreateEventBuilder).toHaveBeenCalledTimes(1);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MUSD_CONVERSION_CTA_CLICKED,
      );

      expect(mockAddProperties).toHaveBeenCalledTimes(1);
      expect(mockAddProperties).toHaveBeenCalledWith({
        location: EVENT_LOCATIONS.ASSET_OVERVIEW,
        redirects_to: EVENT_LOCATIONS.CONVERSION_EDUCATION_SCREEN,
        cta_type: MUSD_CTA_TYPES.TERTIARY,
        cta_text: expectedCtaText,
        network_chain_id: asset.chainId,
        network_name: 'Ethereum Mainnet',
        asset_symbol: asset.symbol,
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'mock-built-event' });
    });

    it('tracks mUSD conversion CTA clicked event when user has seen education screen', async () => {
      // Arrange
      jest.mocked(useMusdConversion).mockReturnValue({
        initiateConversion: mockInitiateConversion,
        error: null,
        hasSeenConversionEducationScreen: true,
      });

      const asset = createMockToken();

      const { getByTestId } = renderWithProvider(
        <MusdConversionAssetOverviewCta asset={asset} />,
        { state: initialRootState },
      );

      // Act
      await act(async () => {
        fireEvent.press(
          getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
        );
      });

      // Assert
      const expectedCtaText = `${strings('earn.musd_conversion.earn_rewards_when')} ${strings('earn.musd_conversion.you_convert_to')} mUSD`;

      expect(mockCreateEventBuilder).toHaveBeenCalledTimes(1);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MUSD_CONVERSION_CTA_CLICKED,
      );

      expect(mockAddProperties).toHaveBeenCalledTimes(1);
      expect(mockAddProperties).toHaveBeenCalledWith({
        location: EVENT_LOCATIONS.ASSET_OVERVIEW,
        redirects_to: EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN,
        cta_type: MUSD_CTA_TYPES.TERTIARY,
        cta_text: expectedCtaText,
        network_chain_id: asset.chainId,
        network_name: 'Ethereum Mainnet',
        asset_symbol: asset.symbol,
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'mock-built-event' });
    });
  });
});
