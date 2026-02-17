import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import {
  MusdMaxConversionInfo,
  MusdMaxConversionInfoTestIds,
} from './musd-max-conversion-info';
import { AssetType } from '../../../types/token';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
} from '../../../hooks/pay/useTransactionPayData';
import { useNoPayTokenQuotesAlert } from '../../../hooks/alerts/useNoPayTokenQuotesAlert';
import { useTransactionConfirm } from '../../../hooks/transactions/useTransactionConfirm';
import { useAlerts } from '../../../context/alert-system-context';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';

const mockToken: AssetType = {
  address: '0x123',
  symbol: 'USDC',
  decimals: 6,
  name: 'USD Coin',
  chainId: '0x1',
} as AssetType;

const mockUseParams = jest.fn();
jest.mock('../../../../../../util/navigation/navUtils', () => ({
  useParams: (defaults?: Record<string, unknown>) =>
    mockUseParams(defaults) ?? defaults ?? {},
}));

jest.mock('react-redux', () => {
  const actual =
    jest.requireActual<typeof import('react-redux')>('react-redux');
  const networkInfos = jest.requireActual<
    typeof import('../../../../../../selectors/networkInfos')
  >('../../../../../../selectors/networkInfos');
  return {
    ...actual,
    useSelector: jest.fn((selector: (state: unknown) => unknown) => {
      if (selector === networkInfos.selectNetworkName) {
        return 'Ethereum Mainnet';
      }
      return actual.useSelector(selector);
    }),
  };
});

jest.mock('../../../hooks/transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

jest.mock('../../../hooks/pay/useTransactionPayData', () => ({
  useIsTransactionPayLoading: jest.fn(),
  useTransactionPayQuotes: jest.fn(),
}));

jest.mock('../../../hooks/alerts/useNoPayTokenQuotesAlert', () => ({
  useNoPayTokenQuotesAlert: jest.fn(),
}));

jest.mock('../../../hooks/transactions/useTransactionConfirm', () => ({
  useTransactionConfirm: jest.fn(),
}));

jest.mock('../../../context/alert-system-context', () => ({
  useAlerts: jest.fn(),
}));

jest.mock(
  '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter',
  () => ({
    __esModule: true,
    default: jest.fn(),
  }),
);

jest.mock('./musd-max-conversion-asset-header', () => ({
  MusdMaxConversionAssetHeader: () => null,
}));

jest.mock('../../rows/relay-you-receive-row', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const { View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    RelayYouReceiveRow: ({ testID }: { testID?: string }) =>
      testID ? ReactModule.createElement(View, { testID }) : null,
  };
});

jest.mock('../../rows/bridge-fee-row', () => ({
  BridgeFeeRow: () => null,
}));

jest.mock('../../rows/total-row', () => ({
  TotalRow: () => null,
}));

jest.mock('../../rows/percentage-row', () => ({
  PercentageRow: () => null,
}));

const mockUseTransactionMetadataRequest = jest.mocked(
  useTransactionMetadataRequest,
);
const mockUseIsTransactionPayLoading = jest.mocked(useIsTransactionPayLoading);
const mockUseTransactionPayQuotes = jest.mocked(useTransactionPayQuotes);
const mockUseNoPayTokenQuotesAlert = jest.mocked(useNoPayTokenQuotesAlert);
const mockUseTransactionConfirm = jest.mocked(useTransactionConfirm);
const mockUseAlerts = jest.mocked(useAlerts);
const mockUseFiatFormatter = jest.mocked(useFiatFormatter);

function setupMocksForSuccessPath() {
  mockUseParams.mockReturnValue({ token: mockToken });
  mockUseTransactionMetadataRequest.mockReturnValue({
    chainId: '0x1',
  } as unknown as ReturnType<typeof useTransactionMetadataRequest>);
  mockUseIsTransactionPayLoading.mockReturnValue(false);
  mockUseTransactionPayQuotes.mockReturnValue([
    { strategy: 'test' },
  ] as ReturnType<typeof useTransactionPayQuotes>);
  mockUseNoPayTokenQuotesAlert.mockReturnValue([]);
  mockUseTransactionConfirm.mockReturnValue({ onConfirm: jest.fn() });
  mockUseAlerts.mockReturnValue({
    hasBlockingAlerts: false,
  } as ReturnType<typeof useAlerts>);
  mockUseFiatFormatter.mockReturnValue((value: { toString: () => string }) =>
    value.toString(),
  );
}

describe('MusdMaxConversionInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocksForSuccessPath();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders container with CONTAINER testID', () => {
      renderWithProvider(<MusdMaxConversionInfo />, { state: {} });

      const container = screen.getByTestId(
        MusdMaxConversionInfoTestIds.CONTAINER,
      );
      expect(container).toBeOnTheScreen();
    });
  });

  describe('noPayTokenQuotesAlert', () => {
    it('displays error text when noPayTokenQuotesAlert has items', () => {
      mockUseNoPayTokenQuotesAlert.mockReturnValue([
        {
          key: 'NoPayTokenQuotes',
          message: 'No quotes available',
          title: 'Error',
          severity: 'danger',
          isBlocking: true,
        },
      ] as never);

      renderWithProvider(<MusdMaxConversionInfo />, { state: {} });

      expect(
        screen.getByText(
          'Failed to get quotes. Please close this modal and try again.',
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('confirm button', () => {
    it('calls onConfirm when confirm button is pressed', () => {
      const mockOnConfirm = jest.fn();
      mockUseTransactionConfirm.mockReturnValue({ onConfirm: mockOnConfirm });

      renderWithProvider(<MusdMaxConversionInfo />, { state: {} });

      const confirmButton = screen.getByTestId(
        MusdMaxConversionInfoTestIds.CONFIRM_BUTTON,
      );
      fireEvent.press(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('disables confirm button when transaction metadata is missing', () => {
      mockUseTransactionMetadataRequest.mockReturnValue(undefined);

      renderWithProvider(<MusdMaxConversionInfo />, { state: {} });

      const confirmButton = screen.getByTestId(
        MusdMaxConversionInfoTestIds.CONFIRM_BUTTON,
      );
      expect(confirmButton.props.disabled).toBe(true);
    });

    it('disables confirm button when quotes are loading', () => {
      mockUseIsTransactionPayLoading.mockReturnValue(true);

      renderWithProvider(<MusdMaxConversionInfo />, { state: {} });

      const confirmButton = screen.getByTestId(
        MusdMaxConversionInfoTestIds.CONFIRM_BUTTON,
      );
      expect(confirmButton.props.disabled).toBe(true);
    });

    it('disables confirm button when quotes array is empty', () => {
      mockUseTransactionPayQuotes.mockReturnValue([]);

      renderWithProvider(<MusdMaxConversionInfo />, { state: {} });

      const confirmButton = screen.getByTestId(
        MusdMaxConversionInfoTestIds.CONFIRM_BUTTON,
      );
      expect(confirmButton.props.disabled).toBe(true);
    });

    it('disables confirm button when hasBlockingAlerts is true', () => {
      mockUseAlerts.mockReturnValue({
        hasBlockingAlerts: true,
      } as ReturnType<typeof useAlerts>);

      renderWithProvider(<MusdMaxConversionInfo />, { state: {} });

      const confirmButton = screen.getByTestId(
        MusdMaxConversionInfoTestIds.CONFIRM_BUTTON,
      );
      expect(confirmButton.props.disabled).toBe(true);
    });

    it('enables confirm button when not loading and no blocking alerts', () => {
      renderWithProvider(<MusdMaxConversionInfo />, { state: {} });

      const confirmButton = screen.getByTestId(
        MusdMaxConversionInfoTestIds.CONFIRM_BUTTON,
      );
      expect(confirmButton.props.disabled).toBe(false);
    });
  });
});
