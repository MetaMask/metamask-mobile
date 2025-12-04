import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import MusdConversionAssetOverviewCta from '.';
import { useMusdConversion } from '../../../hooks/useMusdConversion';
import { EARN_TEST_IDS } from '../../../constants/testIds';
import initialRootState from '../../../../../../util/test/initial-root-state';
import Logger from '../../../../../../util/Logger';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenI } from '../../../../Tokens/types';

jest.mock('../../../hooks/useMusdConversion');
jest.mock('../../../../../../util/Logger');

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

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
  const mockInitiateConversion = jest.fn();
  const mockLoggerError = jest.mocked(Logger.error);

  beforeEach(() => {
    jest.clearAllMocks();

    jest.mocked(useMusdConversion).mockReturnValue({
      initiateConversion: mockInitiateConversion,
      error: null,
      hasSeenConversionEducationScreen: true,
    });
  });

  afterEach(() => {
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

      expect(getByText(/Earn rewards when/)).toBeOnTheScreen();
      expect(getByText(/you convert to/)).toBeOnTheScreen();
      expect(getByText('mUSD')).toBeOnTheScreen();
    });
  });

  describe('press handler - education screen path', () => {
    beforeEach(() => {
      jest.mocked(useMusdConversion).mockReturnValue({
        initiateConversion: mockInitiateConversion,
        error: null,
        hasSeenConversionEducationScreen: false,
      });
    });

    it('navigates to education screen when user has not seen it', async () => {
      const mockToken = createMockToken();

      const { getByText } = renderWithProvider(
        <MusdConversionAssetOverviewCta asset={mockToken} />,
        { state: initialRootState },
      );

      await act(async () => {
        fireEvent.press(getByText('mUSD'));
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.EARN.ROOT,
        expect.objectContaining({
          screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
        }),
      );
    });

    it('passes correct route params to education screen', async () => {
      const mockToken = createMockToken({
        address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        chainId: '0x1',
      });

      const { getByText } = renderWithProvider(
        <MusdConversionAssetOverviewCta asset={mockToken} />,
        { state: initialRootState },
      );

      await act(async () => {
        fireEvent.press(getByText('mUSD'));
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
        screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
        params: {
          preferredPaymentToken: {
            address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
            chainId: '0x1',
          },
          outputChainId: CHAIN_IDS.MAINNET,
        },
      });
    });

    it('does not call initiateConversion when navigating to education screen', async () => {
      const mockToken = createMockToken();

      const { getByText } = renderWithProvider(
        <MusdConversionAssetOverviewCta asset={mockToken} />,
        { state: initialRootState },
      );

      await act(async () => {
        fireEvent.press(getByText('mUSD'));
      });

      expect(mockInitiateConversion).not.toHaveBeenCalled();
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

      const { getByText } = renderWithProvider(
        <MusdConversionAssetOverviewCta asset={mockToken} />,
        { state: initialRootState },
      );

      await act(async () => {
        fireEvent.press(getByText('mUSD'));
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

      const { getByText } = renderWithProvider(
        <MusdConversionAssetOverviewCta asset={mockToken} />,
        { state: initialRootState },
      );

      await act(async () => {
        fireEvent.press(getByText('mUSD'));
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

      const { getByText } = renderWithProvider(
        <MusdConversionAssetOverviewCta asset={mockToken} />,
        { state: initialRootState },
      );

      await act(async () => {
        fireEvent.press(getByText('mUSD'));
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

      const { getByText } = renderWithProvider(
        <MusdConversionAssetOverviewCta asset={mockToken} />,
        { state: initialRootState },
      );

      await act(async () => {
        fireEvent.press(getByText('mUSD'));
      });

      await waitFor(() => {
        const errorArg = mockLoggerError.mock.calls[0][0] as Error;
        expect(errorArg.message).toBe('Asset address or chain ID is not set');
      });
    });

    it('logs error when asset chainId is missing', async () => {
      const mockToken = createMockToken({ chainId: '' });

      const { getByText } = renderWithProvider(
        <MusdConversionAssetOverviewCta asset={mockToken} />,
        { state: initialRootState },
      );

      await act(async () => {
        fireEvent.press(getByText('mUSD'));
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

      const { getByText } = renderWithProvider(
        <MusdConversionAssetOverviewCta asset={mockToken} />,
        { state: initialRootState },
      );

      await act(async () => {
        fireEvent.press(getByText('mUSD'));
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

      const { getByText } = renderWithProvider(
        <MusdConversionAssetOverviewCta asset={mockToken} />,
        { state: initialRootState },
      );

      await act(async () => {
        fireEvent.press(getByText('mUSD'));
      });

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          testError,
          '[mUSD Conversion] Failed to initiate conversion from asset overview CTA',
        );
      });
    });
  });
});
