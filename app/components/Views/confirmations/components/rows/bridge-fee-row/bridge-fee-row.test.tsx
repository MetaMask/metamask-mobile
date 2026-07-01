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
  useTransactionPayFiatPayment,
  useTransactionPayQuotes,
  useTransactionPaySourceAmounts,
  useTransactionPayTotals,
} from '../../../hooks/pay/useTransactionPayData';
import { useIsPaidByMetaMask } from '../../../hooks/pay/useIsPaidByMetaMask';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { Json } from '@metamask/utils';

jest.mock('../../../hooks/pay/useTransactionPayData');
jest.mock('../../../hooks/pay/useIsPaidByMetaMask');
jest.mock('../../../hooks/metrics/useConfirmationAlertMetrics', () => ({
  useConfirmationAlertMetrics: () => ({
    trackInlineAlertClicked: jest.fn(),
    trackAlertActionClicked: jest.fn(),
    trackAlertRendered: jest.fn(),
  }),
}));

function render(
  options: { type?: TransactionType; isGasFeeSponsored?: boolean } = {},
) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    otherControllersMock,
  );

  const tx = (
    state.engine.backgroundState
      .TransactionController as TransactionControllerState
  ).transactions[0];

  tx.type = options.type ?? TransactionType.perpsDeposit;

  if (options.isGasFeeSponsored !== undefined) {
    tx.isGasFeeSponsored = options.isGasFeeSponsored;
  }

  return renderWithProvider(<BridgeFeeRow />, { state });
}

describe('BridgeFeeRow', () => {
  const useTransactionTotalsMock = jest.mocked(useTransactionPayTotals);
  const useTransactionPayQuotesMock = jest.mocked(useTransactionPayQuotes);
  const useTransactionPaySourceAmountsMock = jest.mocked(
    useTransactionPaySourceAmounts,
  );
  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );
  const useIsPaidByMetaMaskMock = jest.mocked(useIsPaidByMetaMask);
  const useTransactionPayFiatPaymentMock = jest.mocked(
    useTransactionPayFiatPayment,
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

    useTransactionPaySourceAmountsMock.mockReturnValue([]);

    useIsPaidByMetaMaskMock.mockReturnValue(false);

    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);
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

  it('renders $0 fee when transaction is gas fee sponsored', () => {
    const { getByText } = render({ isGasFeeSponsored: true });
    expect(getByText('$0')).toBeOnTheScreen();
  });

  it('renders fee from totals when gas fee sponsored and fiat payment selected', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-123',
    } as never);

    const { getByText } = render({ isGasFeeSponsored: true });

    expect(getByText('$1.23')).toBeOnTheScreen();
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
      useIsPaidByMetaMaskMock.mockReturnValue(true);

      const { getByText, queryByTestId } = render({
        type: TransactionType.musdConversion,
      });

      expect(getByText('Paid by MetaMask')).toBeOnTheScreen();
      expect(queryByTestId('transaction-fee')).toBeNull();
    });

    it('renders paid by MetaMask label for Money Account Deposit with all-zero fees and quotes', () => {
      useTransactionTotalsMock.mockReturnValue(zeroFeesTotals);
      useIsPaidByMetaMaskMock.mockReturnValue(true);

      const { getByText, queryByTestId } = render({
        type: TransactionType.moneyAccountDeposit,
      });

      expect(getByText('Paid by MetaMask')).toBeOnTheScreen();
      expect(queryByTestId('transaction-fee')).toBeNull();
    });

    it('hides the tooltip icon when paid by MetaMask is shown', () => {
      useTransactionTotalsMock.mockReturnValue(zeroFeesTotals);
      useIsPaidByMetaMaskMock.mockReturnValue(true);

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
      useIsPaidByMetaMaskMock.mockReturnValue(true);

      const { getByText, queryByTestId } = render({
        type: TransactionType.musdConversion,
      });

      expect(getByText('Paid by MetaMask')).toBeOnTheScreen();
      expect(queryByTestId('transaction-fee')).toBeNull();
    });
  });

  describe('on-ramp fee breakout', () => {
    const totalsWithOnRampFee = {
      fees: {
        provider: { usd: '1.00' },
        providerFiat: { usd: '0.70' },
        sourceNetwork: { estimate: { usd: '0.20' } },
        targetNetwork: { usd: '0.03' },
        metaMask: { usd: '0', fiat: '0' },
      },
    } as TransactionPayTotals;

    it('shows a separate on-ramp fee row and reduced provider fee when providerFiat is present', async () => {
      useTransactionTotalsMock.mockReturnValue(totalsWithOnRampFee);

      const { getByTestId, getByText } = render({
        type: TransactionType.moneyAccountDeposit,
      });

      await act(async () => {
        fireEvent.press(getByTestId('info-row-tooltip-open-btn'));
      });

      // On-ramp leg broken out; provider line shows the relay remainder
      // (provider 1.00 - providerFiat 0.70 = 0.30). Line items still sum to the
      // unchanged row total.
      expect(getByText('On-ramp fee')).toBeOnTheScreen();
      expect(getByText('$0.70')).toBeOnTheScreen();
      expect(getByText('$0.30')).toBeOnTheScreen();
    });

    it('keeps the row total unchanged when breaking out the on-ramp fee', () => {
      useTransactionTotalsMock.mockReturnValue(totalsWithOnRampFee);

      const { getByText } = render({
        type: TransactionType.moneyAccountDeposit,
      });

      // 1.00 provider + 0.23 network + 0 metaMask = 1.23
      expect(getByText('$1.23')).toBeOnTheScreen();
    });

    it('does not render an on-ramp fee row when providerFiat is absent', async () => {
      const { getByTestId, getByText, queryByText } = render({
        type: TransactionType.moneyAccountDeposit,
      });

      await act(async () => {
        fireEvent.press(getByTestId('info-row-tooltip-open-btn'));
      });

      expect(queryByText('On-ramp fee')).toBeNull();
      // Provider fee shows the full provider total when nothing is broken out.
      expect(getByText('$1')).toBeOnTheScreen();
    });
  });

  describe('tooltip messages', () => {
    it.each([
      [TransactionType.predictDeposit],
      [TransactionType.predictWithdraw],
      [TransactionType.musdConversion],
      [TransactionType.moneyAccountDeposit],
      [TransactionType.moneyAccountWithdraw],
    ])('renders tooltip with $ value for %s', async (type) => {
      const { getByTestId } = render({ type });

      await act(async () => {
        fireEvent.press(getByTestId('info-row-tooltip-open-btn'));
      });

      expect(getByTestId('info-row-tooltip-close-btn')).toBeOnTheScreen();
    });

    it('renders moneyAccountDeposit tooltip copy', async () => {
      const { getByTestId, getByText } = render({
        type: TransactionType.moneyAccountDeposit,
      });

      await act(async () => {
        fireEvent.press(getByTestId('info-row-tooltip-open-btn'));
      });

      expect(
        getByText(
          'Conversion fees include network costs and may include provider fees.',
        ),
      ).toBeOnTheScreen();
    });
  });
});
