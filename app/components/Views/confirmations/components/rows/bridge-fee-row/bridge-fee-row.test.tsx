import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { BridgeFeeRow } from './bridge-fee-row';
import { act, fireEvent } from '@testing-library/react-native';
import {
  TransactionControllerState,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  TransactionPayQuote,
  TransactionPayTotals,
} from '@metamask/transaction-pay-controller';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
  useTransactionPayTotals,
} from '../../../hooks/pay/useTransactionPayData';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { Json } from '@metamask/utils';

jest.mock('../../../hooks/pay/useTransactionPayData');
jest.mock('../../../hooks/metrics/useConfirmationAlertMetrics', () => ({
  useConfirmationAlertMetrics: () => ({
    trackInlineAlertClicked: jest.fn(),
    trackAlertActionClicked: jest.fn(),
    trackAlertRendered: jest.fn(),
  }),
}));

function render(options: { type?: TransactionType } = {}) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    otherControllersMock,
  );

  (
    state.engine.backgroundState
      .TransactionController as TransactionControllerState
  ).transactions[0].type = options.type ?? TransactionType.perpsDeposit;

  return renderWithProvider(<BridgeFeeRow />, { state });
}

describe('BridgeFeeRow', () => {
  const useTransactionTotalsMock = jest.mocked(useTransactionPayTotals);
  const useTransactionPayQuotesMock = jest.mocked(useTransactionPayQuotes);
  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionTotalsMock.mockReturnValue({
      fees: {
        provider: { usd: '1.00' },
        sourceNetwork: { estimate: { usd: '0.20' } },
        targetNetwork: { usd: '0.03' },
        metaMask: { usd: '0', fiat: '0' },
      },
    } as TransactionPayTotals);

    useIsTransactionPayLoadingMock.mockReturnValue(false);

    useTransactionPayQuotesMock.mockReturnValue([
      {} as TransactionPayQuote<Json>,
    ]);
  });

  it('renders transaction fee', async () => {
    const { getByText } = render();
    expect(getByText('$1.23')).toBeDefined();
  });

  it('renders network fee in tooltip', async () => {
    const { getByTestId, getByText } = render();

    await act(async () => {
      fireEvent.press(getByTestId('info-row-tooltip-open-btn'));
    });

    expect(getByText('$0.23')).toBeDefined();
  });

  it('renders bridge fee in tooltip', async () => {
    const { getByTestId, getByText } = render();

    await act(async () => {
      fireEvent.press(getByTestId('info-row-tooltip-open-btn'));
    });

    expect(getByText('$1')).toBeDefined();
  });

  it('renders skeletons if quotes loading', async () => {
    useIsTransactionPayLoadingMock.mockReturnValue(true);

    const { getByTestId, queryByTestId } = render();

    expect(getByTestId('bridge-fee-row-skeleton')).toBeDefined();
    expect(queryByTestId('metamask-fee-row-skeleton')).toBeNull();
  });

  it('renders fee from totals when there are no quotes', () => {
    useTransactionPayQuotesMock.mockReturnValue([]);
    const { getByText } = render();
    expect(getByText('$1.23')).toBeOnTheScreen();
  });

  it('does not render tooltip when there are no quotes', () => {
    useTransactionPayQuotesMock.mockReturnValue([]);
    const { queryByTestId } = render();
    expect(queryByTestId('info-row-tooltip-open-btn')).toBeNull();
  });

  it('includes metamask fee in transaction fee total', () => {
    useTransactionTotalsMock.mockReturnValue({
      fees: {
        provider: { usd: '0' },
        sourceNetwork: { estimate: { usd: '0' } },
        targetNetwork: { usd: '0' },
        metaMask: { usd: '0.50', fiat: '0.50' },
      },
    } as TransactionPayTotals);

    const { getByText } = render();

    expect(getByText('$0.50')).toBeOnTheScreen();
  });

  it('transaction fee total is correct when metamask fee is zero', () => {
    useTransactionTotalsMock.mockReturnValue({
      fees: {
        provider: { usd: '1.00' },
        sourceNetwork: { estimate: { usd: '0.20' } },
        targetNetwork: { usd: '0.03' },
        metaMask: { usd: '0', fiat: '0' },
      },
    } as TransactionPayTotals);

    const { getByText } = render();

    expect(getByText('$1.23')).toBeOnTheScreen();
  });

  it('renders tooltip for perps withdraw', async () => {
    const { getByTestId } = render({
      type: TransactionType.perpsWithdraw,
    });

    await act(async () => {
      fireEvent.press(getByTestId('info-row-tooltip-open-btn'));
    });

    expect(getByTestId('info-row-tooltip-open-btn')).toBeDefined();
  });

  it('renders fee for perps withdraw', () => {
    const { getByText } = render({
      type: TransactionType.perpsWithdraw,
    });

    expect(getByText('$1.23')).toBeDefined();
  });

  it('renders metamask fee in tooltip', async () => {
    useTransactionTotalsMock.mockReturnValue({
      fees: {
        provider: { usd: '0.05' },
        sourceNetwork: { estimate: { usd: '0.01' } },
        targetNetwork: { usd: '0' },
        metaMask: { usd: '0.50', fiat: '0.50' },
      },
    } as TransactionPayTotals);

    const { getByTestId, getByText } = render();

    await act(async () => {
      fireEvent.press(getByTestId('info-row-tooltip-open-btn'));
    });

    expect(getByText('$0.50')).toBeOnTheScreen();
  });

  describe('paid by MetaMask', () => {
    const zeroFeesTotals = {
      fees: {
        provider: { usd: '0' },
        sourceNetwork: { estimate: { usd: '0' } },
        targetNetwork: { usd: '0' },
        metaMask: { usd: '0', fiat: '0' },
      },
    } as TransactionPayTotals;

    it('renders paid by MetaMask label for musd conversion with all-zero fees and quotes', () => {
      useTransactionTotalsMock.mockReturnValue(zeroFeesTotals);

      const { getByText, queryByTestId } = render({
        type: TransactionType.musdConversion,
      });

      expect(getByText('Paid by MetaMask')).toBeOnTheScreen();
      expect(queryByTestId('transaction-fee')).toBeNull();
    });

    it('hides the tooltip icon when paid by MetaMask is shown', () => {
      useTransactionTotalsMock.mockReturnValue(zeroFeesTotals);

      const { queryByTestId } = render({
        type: TransactionType.musdConversion,
      });

      expect(queryByTestId('info-row-tooltip-open-btn')).toBeNull();
    });

    it('renders fee value (not paid by MetaMask) for moneyAccountDeposit with all-zero fees', () => {
      useTransactionTotalsMock.mockReturnValue(zeroFeesTotals);

      const { getByText, queryByText } = render({
        type: TransactionType.moneyAccountDeposit,
      });

      expect(getByText('$0')).toBeOnTheScreen();
      expect(queryByText('Paid by MetaMask')).toBeNull();
    });

    it('renders fee value (not paid by MetaMask) for perpsDeposit with all-zero fees', () => {
      useTransactionTotalsMock.mockReturnValue(zeroFeesTotals);

      const { getByText, getByTestId, queryByText } = render({
        type: TransactionType.perpsDeposit,
      });

      expect(getByText('$0')).toBeOnTheScreen();
      expect(queryByText('Paid by MetaMask')).toBeNull();
      expect(getByTestId('info-row-tooltip-open-btn')).toBeOnTheScreen();
    });

    it('renders fee value (not paid by MetaMask) for musd conversion with non-zero fees', () => {
      const { getByText, getByTestId, queryByText } = render({
        type: TransactionType.musdConversion,
      });

      expect(getByText('$1.23')).toBeOnTheScreen();
      expect(queryByText('Paid by MetaMask')).toBeNull();
      expect(getByTestId('info-row-tooltip-open-btn')).toBeOnTheScreen();
    });

    it('renders skeleton (not paid by MetaMask) while loading', () => {
      useTransactionTotalsMock.mockReturnValue(zeroFeesTotals);
      useIsTransactionPayLoadingMock.mockReturnValue(true);

      const { getByTestId, queryByText, queryByTestId } = render({
        type: TransactionType.musdConversion,
      });

      expect(getByTestId('bridge-fee-row-skeleton')).toBeOnTheScreen();
      expect(queryByText('Paid by MetaMask')).toBeNull();
      expect(queryByTestId('transaction-fee')).toBeNull();
    });

    it('does not render paid by MetaMask when quotes are empty', () => {
      useTransactionTotalsMock.mockReturnValue(zeroFeesTotals);
      useTransactionPayQuotesMock.mockReturnValue([]);

      const { queryByText, queryByTestId } = render({
        type: TransactionType.musdConversion,
      });

      expect(queryByText('Paid by MetaMask')).toBeNull();
      // feeTotalUsd useMemo returns '' when totals?.fees is falsy; here fees
      // exist so we render the $ Text with the formatted zero total.
      expect(queryByTestId('transaction-fee')).toBeOnTheScreen();
    });

    it('renders paid by MetaMask when metaMask.usd is undefined and other fees are zero', () => {
      useTransactionTotalsMock.mockReturnValue({
        fees: {
          provider: { usd: '0' },
          sourceNetwork: { estimate: { usd: '0' } },
          targetNetwork: { usd: '0' },
          metaMask: { fiat: '0' },
        },
      } as TransactionPayTotals);

      const { getByText, queryByTestId } = render({
        type: TransactionType.musdConversion,
      });

      expect(getByText('Paid by MetaMask')).toBeOnTheScreen();
      expect(queryByTestId('transaction-fee')).toBeNull();
    });
  });

  describe('tooltip messages', () => {
    it.each([
      [TransactionType.predictDeposit],
      [TransactionType.predictWithdraw],
      [TransactionType.musdConversion],
      [TransactionType.moneyAccountWithdraw],
    ])('renders tooltip with $ value for %s', async (type) => {
      const { getByTestId } = render({ type });

      await act(async () => {
        fireEvent.press(getByTestId('info-row-tooltip-open-btn'));
      });

      expect(getByTestId('info-row-tooltip-close-btn')).toBeOnTheScreen();
    });
  });
});
