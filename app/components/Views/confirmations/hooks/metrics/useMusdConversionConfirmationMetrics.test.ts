import { merge } from 'lodash';
import { updateConfirmationMetric } from '../../../../../core/redux/slices/confirmationMetrics';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { useMusdConversionConfirmationMetrics } from './useMusdConversionConfirmationMetrics';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import {
  useTransactionPayIsMaxAmount,
  useTransactionPayQuotes,
} from '../pay/useTransactionPayData';
import { getMusdConversionQuoteTrackingData } from '../../../../UI/Earn/utils/analytics';
import { useParams } from '../../../../../util/navigation/navUtils';
import { MUSD_EVENTS_CONSTANTS } from '../../../../UI/Earn/constants/events';
import { Hex, Json } from '@metamask/utils';
import { TransactionPayQuote } from '@metamask/transaction-pay-controller';

const { EVENT_LOCATIONS } = MUSD_EVENTS_CONSTANTS;

jest.mock('../../../../../core/redux/slices/confirmationMetrics', () => ({
  ...(jest.requireActual(
    '../../../../../core/redux/slices/confirmationMetrics',
  ) as object),
  updateConfirmationMetric: jest.fn(),
}));

jest.mock('../pay/useTransactionPayData', () => ({
  ...(jest.requireActual('../pay/useTransactionPayData') as object),
  useTransactionPayQuotes: jest.fn(),
  useTransactionPayIsMaxAmount: jest.fn(),
}));

jest.mock('../../../../UI/Earn/utils/analytics', () => ({
  ...(jest.requireActual('../../../../UI/Earn/utils/analytics') as object),
  getMusdConversionQuoteTrackingData: jest.fn(),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...(jest.requireActual('../../../../../util/navigation/navUtils') as object),
  useParams: jest.fn(),
}));

const QUOTE_TRACKING_DATA_MOCK = {
  quote_payment_chain_id: '0x1' as Hex,
  quote_output_chain_id: '0xa' as Hex,
  quote_is_same_chain: false,
  pay_quote_strategy: 'bridge',
};

function runHook() {
  return renderHookWithProvider(useMusdConversionConfirmationMetrics, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
    ),
  });
}

function runHookWithoutTransaction() {
  return renderHookWithProvider(useMusdConversionConfirmationMetrics, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      otherControllersMock,
      {
        engine: {
          backgroundState: {
            ApprovalController: {
              pendingApprovals: {},
              pendingApprovalCount: 0,
              approvalFlows: [],
            },
          },
        },
      },
    ),
  });
}

describe('useMusdConversionConfirmationMetrics', () => {
  const updateConfirmationMetricMock = jest.mocked(updateConfirmationMetric);
  const useTransactionPayQuotesMock = jest.mocked(useTransactionPayQuotes);
  const useTransactionPayIsMaxAmountMock = jest.mocked(
    useTransactionPayIsMaxAmount,
  );
  const getMusdConversionQuoteTrackingDataMock = jest.mocked(
    getMusdConversionQuoteTrackingData,
  );
  const useParamsMock = jest.mocked(useParams);

  beforeEach(() => {
    jest.resetAllMocks();

    updateConfirmationMetricMock.mockReturnValue({
      type: 'mockedAction',
    } as never);

    useTransactionPayQuotesMock.mockReturnValue([]);
    useTransactionPayIsMaxAmountMock.mockReturnValue(false);
    getMusdConversionQuoteTrackingDataMock.mockReturnValue(
      QUOTE_TRACKING_DATA_MOCK,
    );
    useParamsMock.mockReturnValue({ forceBottomSheet: false });
  });

  it('dispatches custom_amount_screen source when forceBottomSheet is false', () => {
    useParamsMock.mockReturnValue({ forceBottomSheet: false });

    runHook();

    expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
      id: transactionIdMock,
      params: {
        properties: expect.objectContaining({
          confirmation_source: EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN,
        }),
        sensitiveProperties: {},
      },
    });
  });

  it('dispatches max_convert_bottom_sheet source when forceBottomSheet is true', () => {
    useParamsMock.mockReturnValue({ forceBottomSheet: true });

    runHook();

    expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
      id: transactionIdMock,
      params: {
        properties: expect.objectContaining({
          confirmation_source:
            EVENT_LOCATIONS.QUICK_CONVERT_MAX_BOTTOM_SHEET_CONFIRMATION_SCREEN,
        }),
        sensitiveProperties: {},
      },
    });
  });

  it('dispatches is_max as true when transaction pay config has isMaxAmount', () => {
    useTransactionPayIsMaxAmountMock.mockReturnValue(true);

    runHook();

    expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
      id: transactionIdMock,
      params: {
        properties: expect.objectContaining({
          is_max: true,
        }),
        sensitiveProperties: {},
      },
    });
  });

  it('dispatches is_max as false when isMaxAmount is false', () => {
    useTransactionPayIsMaxAmountMock.mockReturnValue(false);

    runHook();

    expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
      id: transactionIdMock,
      params: {
        properties: expect.objectContaining({
          is_max: false,
        }),
        sensitiveProperties: {},
      },
    });
  });

  it('includes quote tracking data when quotes are available', () => {
    useTransactionPayQuotesMock.mockReturnValue([
      { strategy: 'bridge' } as unknown as TransactionPayQuote<Json>,
    ]);

    runHook();

    expect(getMusdConversionQuoteTrackingDataMock).toHaveBeenCalled();
    expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
      id: transactionIdMock,
      params: {
        properties: expect.objectContaining(QUOTE_TRACKING_DATA_MOCK),
        sensitiveProperties: {},
      },
    });
  });

  it('dispatches empty quote data when no quotes exist', () => {
    useTransactionPayQuotesMock.mockReturnValue([]);

    runHook();

    expect(getMusdConversionQuoteTrackingDataMock).not.toHaveBeenCalled();
    expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
      id: transactionIdMock,
      params: {
        properties: expect.objectContaining({
          confirmation_source: EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN,
          is_max: false,
        }),
        sensitiveProperties: {},
      },
    });
  });

  it('dispatches custom_amount_screen source when forceBottomSheet is undefined', () => {
    useParamsMock.mockReturnValue({});

    runHook();

    expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
      id: transactionIdMock,
      params: {
        properties: expect.objectContaining({
          confirmation_source: EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN,
        }),
        sensitiveProperties: {},
      },
    });
  });

  it('does not dispatch updateConfirmationMetric when txMeta is undefined', () => {
    runHookWithoutTransaction();

    expect(updateConfirmationMetricMock).not.toHaveBeenCalled();
  });
});
