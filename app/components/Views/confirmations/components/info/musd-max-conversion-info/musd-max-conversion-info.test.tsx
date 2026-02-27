import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import {
  MusdMaxConversionInfo,
  MusdMaxConversionInfoTestIds,
} from './musd-max-conversion-info';
import { AssetType } from '../../../types/token';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useTransactionPayData';
import { useTransactionConfirm } from '../../../hooks/transactions/useTransactionConfirm';
import { useAlerts } from '../../../context/alert-system-context';
import useApprovalRequest from '../../../hooks/useApprovalRequest';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { ApprovalType } from '@metamask/controller-utils';

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
}));

jest.mock('../../../hooks/transactions/useTransactionConfirm', () => ({
  useTransactionConfirm: jest.fn(),
}));

jest.mock('../../../context/alert-system-context', () => ({
  useAlerts: jest.fn(),
}));

jest.mock('../../../hooks/useApprovalRequest', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock(
  '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter',
  () => ({
    __esModule: true,
    default: jest.fn(),
  }),
);

jest.mock('../../token-conversion-asset-header', () => ({
  TokenConversionAssetHeader: () => null,
}));

jest.mock('../../rows/bridge-fee-row', () => ({
  BridgeFeeRow: () => null,
}));

jest.mock('../../rows/token-conversion-rate-row', () => ({
  TokenConversionRateRow: () => null,
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
const mockUseTransactionConfirm = jest.mocked(useTransactionConfirm);
const mockUseAlerts = jest.mocked(useAlerts);
const mockUseApprovalRequest = jest.mocked(useApprovalRequest);
const mockUseFiatFormatter = jest.mocked(useFiatFormatter);

function setupMocksForSuccessPath() {
  mockUseParams.mockReturnValue({ token: mockToken });
  mockUseApprovalRequest.mockReturnValue({
    approvalRequest: { type: ApprovalType.Transaction },
  } as ReturnType<typeof useApprovalRequest>);
  mockUseTransactionMetadataRequest.mockReturnValue({
    chainId: '0x1',
  } as unknown as ReturnType<typeof useTransactionMetadataRequest>);
  mockUseIsTransactionPayLoading.mockReturnValue(false);
  mockUseTransactionConfirm.mockReturnValue({ onConfirm: jest.fn() });
  mockUseAlerts.mockReturnValue({
    alerts: [],
    fieldAlerts: [],
    hasBlockingAlerts: false,
    hasUnconfirmedDangerAlerts: false,
  } as unknown as ReturnType<typeof useAlerts>);
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

  describe('blocking alert', () => {
    it('displays blocking alert message when provided', () => {
      mockUseAlerts.mockReturnValue({
        alerts: [
          {
            key: 'BlockingAlert',
            message: 'Cannot proceed with this conversion',
            title: 'Review',
            severity: 'danger',
            isBlocking: true,
          },
        ],
        fieldAlerts: [],
        hasBlockingAlerts: true,
        hasUnconfirmedDangerAlerts: false,
      } as unknown as ReturnType<typeof useAlerts>);

      renderWithProvider(<MusdMaxConversionInfo />, { state: {} });

      expect(
        screen.getByText('Cannot proceed with this conversion'),
      ).toBeOnTheScreen();
    });

    it('uses blocking alert title as button label', () => {
      mockUseAlerts.mockReturnValue({
        alerts: [
          {
            key: 'BlockingAlert',
            message: 'Blocked',
            title: 'Acknowledge First',
            severity: 'danger',
            isBlocking: true,
          },
        ],
        fieldAlerts: [],
        hasBlockingAlerts: true,
        hasUnconfirmedDangerAlerts: false,
      } as unknown as ReturnType<typeof useAlerts>);

      renderWithProvider(<MusdMaxConversionInfo />, { state: {} });

      expect(screen.getByText('Acknowledge First')).toBeOnTheScreen();
    });

    it('does not render blocking alert text when message missing', () => {
      mockUseAlerts.mockReturnValue({
        alerts: [
          {
            key: 'BlockingAlert',
            title: 'Review',
            severity: 'danger',
            isBlocking: true,
          },
        ],
        fieldAlerts: [],
        hasBlockingAlerts: true,
        hasUnconfirmedDangerAlerts: false,
      } as unknown as ReturnType<typeof useAlerts>);

      renderWithProvider(<MusdMaxConversionInfo />, { state: {} });

      expect(
        screen.queryByText('Cannot proceed with this conversion'),
      ).toBeNull();
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

    it('disables confirm button when alerts contain isBlocking entry', () => {
      mockUseAlerts.mockReturnValue({
        alerts: [
          {
            key: 'BlockingAlert',
            message: 'Blocked',
            title: 'Review',
            severity: 'danger',
            isBlocking: true,
          },
        ],
        fieldAlerts: [],
        hasBlockingAlerts: true,
        hasUnconfirmedDangerAlerts: false,
      } as unknown as ReturnType<typeof useAlerts>);

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
