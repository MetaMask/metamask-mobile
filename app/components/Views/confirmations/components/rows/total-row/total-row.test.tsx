import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { BigNumber } from 'bignumber.js';
import I18n from '../../../../../../../locales/i18n';
import formatFiat from '../../../../../../util/formatFiat';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import {
  useIsTransactionPayLoading,
  useTransactionPayIsMaxAmount,
  useTransactionPayQuotesRaw,
  useTransactionPayRequiredTokens,
  useTransactionPayTotals,
} from '../../../hooks/pay/useTransactionPayData';
import { useIsPaidByMetaMask } from '../../../hooks/pay/useIsPaidByMetaMask';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import {
  TransactionPayStrategy,
  TransactionPayTotals,
} from '@metamask/transaction-pay-controller';
import { TransactionType } from '@metamask/transaction-controller';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { MoneyMusdInfoSheetTestIds } from '../../modals/money-musd-info-sheet';
import { TotalRow } from './total-row';

jest.mock('../../../hooks/pay/useIsPaidByMetaMask');
jest.mock('../../../hooks/pay/useTransactionPayData');
jest.mock('../../../hooks/pay/useTransactionPayWithdraw');
jest.mock('../../../../../UI/Money/hooks/useMoneyVaultApy', () => ({
  __esModule: true,
  default: () => ({
    apyDecimal: 0.062,
    apyPercent: 6.2,
    vaultApyQuery: { isLoading: false },
  }),
}));

const TOTAL_FIAT_MOCK = '$123.46';
const RECEIVE_FIAT_MOCK = '$99.38';

function createTotalsMock(
  overrides: Partial<TransactionPayTotals> = {},
): TransactionPayTotals {
  return {
    estimatedDuration: 30,
    fees: {
      metaMask: { fiat: '0', usd: '0' },
      provider: { fiat: '0', usd: '0' },
      sourceNetwork: {
        estimate: { fiat: '0', human: '0', raw: '0', usd: '0' },
        max: { fiat: '0', human: '0', raw: '0', usd: '0' },
      },
      targetNetwork: { fiat: '0', usd: '0' },
    },
    sourceAmount: { fiat: '100', human: '100', raw: '100', usd: '100' },
    targetAmount: { fiat: '99.38', usd: '99.38' },
    total: { fiat: '123.456', usd: '123.456' },
    ...overrides,
  };
}

function render(options: { type?: TransactionType } = {}) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    otherControllersMock,
    options.type && {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [{ type: options.type }],
          },
        },
      },
    },
  );

  return renderWithProvider(<TotalRow />, { state });
}

describe('TotalRow', () => {
  const useTransactionPayTotalsMock = jest.mocked(useTransactionPayTotals);
  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );
  const useTransactionPayIsMaxAmountMock = jest.mocked(
    useTransactionPayIsMaxAmount,
  );
  const useIsPaidByMetaMaskMock = jest.mocked(useIsPaidByMetaMask);
  const useTransactionPayWithdrawMock = jest.mocked(useTransactionPayWithdraw);
  const useTransactionPayQuotesRawMock = jest.mocked(
    useTransactionPayQuotesRaw,
  );
  const useTransactionPayRequiredTokensMock = jest.mocked(
    useTransactionPayRequiredTokens,
  );

  beforeEach(() => {
    jest.clearAllMocks();

    useTransactionPayTotalsMock.mockReturnValue({
      total: { usd: '123.456' },
      targetAmount: { usd: '99.38', fiat: '99.38' },
    } as unknown as TransactionPayTotals);

    useIsTransactionPayLoadingMock.mockReturnValue(false);
    useIsPaidByMetaMaskMock.mockReturnValue(false);

    // Default: deposit/payment flow so the total is shown.
    useTransactionPayWithdrawMock.mockReturnValue({
      isWithdraw: false,
      canSelectWithdrawToken: false,
    });
    useTransactionPayIsMaxAmountMock.mockReturnValue(false);
  });

  describe('total cost', () => {
    it('renders the total amount', () => {
      const { getByTestId, getByText } = render();

      expect(getByTestId('total-row')).toBeOnTheScreen();
      expect(getByText(TOTAL_FIAT_MOCK)).toBeDefined();
    });

    it('renders the total amount for predictDepositAndOrder output-based quotes', () => {
      useTransactionPayTotalsMock.mockReturnValue({
        isInputBased: false,
        total: { usd: '123.456' },
        targetAmount: { usd: '99.38', fiat: '99.38' },
      } as unknown as TransactionPayTotals);

      const { getByTestId, getByText } = render({
        type: TransactionType.predictDepositAndOrder,
      });

      expect(getByTestId('total-row')).toBeOnTheScreen();
      expect(getByText(TOTAL_FIAT_MOCK)).toBeDefined();
    });

    it('renders the total row for target-based non-subsidized moneyAccountDeposit', () => {
      useTransactionPayTotalsMock.mockReturnValue(
        createTotalsMock({ isInputBased: false }),
      );

      const { getByTestId, getByText, queryByTestId, queryByText } = render({
        type: TransactionType.moneyAccountDeposit,
      });

      expect(getByTestId('total-row')).toBeOnTheScreen();
      expect(getByText('Total')).toBeOnTheScreen();
      expect(getByText(TOTAL_FIAT_MOCK)).toBeOnTheScreen();
      expect(queryByTestId('receive-row')).toBeNull();
      expect(queryByText("You'll receive")).toBeNull();
    });

    it('renders the total row for target-based non-subsidized perpsDeposit', () => {
      useTransactionPayTotalsMock.mockReturnValue(
        createTotalsMock({ isInputBased: false }),
      );

      const { getByTestId, getByText, queryByTestId, queryByText } = render({
        type: TransactionType.perpsDeposit,
      });

      expect(getByTestId('total-row')).toBeOnTheScreen();
      expect(getByText('Total')).toBeOnTheScreen();
      expect(queryByTestId('receive-row')).toBeNull();
      expect(queryByText("You'll receive")).toBeNull();
    });

    it('renders skeleton when quotes are loading', () => {
      useIsTransactionPayLoadingMock.mockReturnValue(true);

      const { getByTestId } = render();

      expect(getByTestId('total-row-skeleton')).toBeDefined();
    });

    it('renders the total row when Max is selected on a withdraw flow', () => {
      // Withdraw flows with the feature flag disabled still show the total,
      // even when Max is selected (Max only forces the receive row for
      // non-withdraw flows). isWithdraw is derived from the transaction type.
      useTransactionPayWithdrawMock.mockReturnValue({
        isWithdraw: true,
        canSelectWithdrawToken: false,
      });
      useTransactionPayIsMaxAmountMock.mockReturnValue(true);

      const { getByTestId, queryByTestId } = render({
        type: TransactionType.perpsWithdraw,
      });

      expect(getByTestId('total-row')).toBeOnTheScreen();
      expect(queryByTestId('receive-row')).toBeNull();
    });

    it('renders the total row when paid by MetaMask on a withdraw flow with token selection disabled', () => {
      useTransactionPayWithdrawMock.mockReturnValue({
        isWithdraw: true,
        canSelectWithdrawToken: false,
      });
      useIsPaidByMetaMaskMock.mockReturnValue(true);

      const { getByTestId, queryByTestId } = render({
        type: TransactionType.moneyAccountWithdraw,
      });

      expect(getByTestId('total-row')).toBeOnTheScreen();
      expect(queryByTestId('receive-row')).toBeNull();
    });
  });

  describe('receive amount', () => {
    it('renders the receive row for withdraw flows', () => {
      useTransactionPayWithdrawMock.mockReturnValue({
        isWithdraw: true,
        canSelectWithdrawToken: true,
      });

      const { getByTestId, getByText, queryByTestId } = render();

      expect(getByTestId('receive-row')).toBeOnTheScreen();
      expect(getByText(RECEIVE_FIAT_MOCK)).toBeOnTheScreen();
      expect(queryByTestId('total-row')).toBeNull();
    });

    it('renders the receive row for plain predict deposits that stay input-based', () => {
      useTransactionPayTotalsMock.mockReturnValue({
        isInputBased: true,
        total: { usd: '100', fiat: '100' },
        targetAmount: { usd: '99.38', fiat: '99.38' },
      } as unknown as TransactionPayTotals);

      const { getByTestId, getByText, queryByTestId } = render({
        type: TransactionType.predictDeposit,
      });

      expect(getByTestId('receive-row')).toBeOnTheScreen();
      expect(getByText(RECEIVE_FIAT_MOCK)).toBeOnTheScreen();
      expect(queryByTestId('total-row')).toBeNull();
    });

    it('renders the receive row for input-based non-subsidized moneyAccountDeposit', () => {
      useTransactionPayTotalsMock.mockReturnValue(
        createTotalsMock({
          isInputBased: true,
          total: { fiat: '100', usd: '100' },
        }),
      );

      const { getByTestId, getByText, queryByTestId } = render({
        type: TransactionType.moneyAccountDeposit,
      });

      expect(getByTestId('receive-row')).toBeOnTheScreen();
      expect(getByText("You'll receive")).toBeOnTheScreen();
      expect(getByText(RECEIVE_FIAT_MOCK)).toBeOnTheScreen();
      expect(queryByTestId('total-row')).toBeNull();
    });

    it('renders the receive row for subsidized perpsDeposit', () => {
      useIsPaidByMetaMaskMock.mockReturnValue(true);
      useTransactionPayTotalsMock.mockReturnValue(
        createTotalsMock({
          isInputBased: false,
          targetAmount: { fiat: '100', usd: '100' },
          total: { fiat: '100', usd: '100' },
        }),
      );

      const { getByTestId, getByText, queryByTestId } = render({
        type: TransactionType.perpsDeposit,
      });

      expect(getByTestId('receive-row')).toBeOnTheScreen();
      expect(getByText("You'll receive")).toBeOnTheScreen();
      expect(getByText('$100')).toBeOnTheScreen();
      expect(queryByTestId('total-row')).toBeNull();
      expect(queryByTestId('receive-pressable')).toBeNull();
    });

    it('renders the receive row for subsidized predictDeposit', () => {
      useIsPaidByMetaMaskMock.mockReturnValue(true);
      useTransactionPayTotalsMock.mockReturnValue(
        createTotalsMock({
          isInputBased: false,
          targetAmount: { fiat: '100', usd: '100' },
          total: { fiat: '100', usd: '100' },
        }),
      );

      const { getByTestId, getByText, queryByTestId } = render({
        type: TransactionType.predictDeposit,
      });

      expect(getByTestId('receive-row')).toBeOnTheScreen();
      expect(getByText("You'll receive")).toBeOnTheScreen();
      expect(getByText('$100')).toBeOnTheScreen();
      expect(queryByTestId('total-row')).toBeNull();
      expect(queryByTestId('receive-pressable')).toBeNull();
    });

    it('renders the receive row for non-withdraw flows when Max is selected', () => {
      useTransactionPayIsMaxAmountMock.mockReturnValue(true);

      const { getByTestId, getByText, queryByTestId } = render();

      expect(getByTestId('receive-row')).toBeOnTheScreen();
      expect(getByText(RECEIVE_FIAT_MOCK)).toBeOnTheScreen();
      expect(queryByTestId('total-row')).toBeNull();
    });

    it('renders the receive skeleton when quotes are loading', () => {
      useTransactionPayWithdrawMock.mockReturnValue({
        isWithdraw: true,
        canSelectWithdrawToken: true,
      });
      useIsTransactionPayLoadingMock.mockReturnValue(true);

      const { getByTestId } = render();

      expect(getByTestId('receive-row-skeleton')).toBeDefined();
    });

    it('renders the target amount even when it is zero', () => {
      useTransactionPayWithdrawMock.mockReturnValue({
        isWithdraw: true,
        canSelectWithdrawToken: true,
      });
      useTransactionPayTotalsMock.mockReturnValue({
        total: { usd: '123.456' },
        targetAmount: { usd: '0', fiat: '0' },
      } as unknown as TransactionPayTotals);

      const { getByText } = render();

      expect(getByText('$0')).toBeOnTheScreen();
    });
  });

  describe('no-op quote routes', () => {
    beforeEach(() => {
      useTransactionPayWithdrawMock.mockReturnValue({
        isWithdraw: true,
        canSelectWithdrawToken: true,
      });
      // A no-op quote is excluded from totals, so targetAmount stays at 0.
      useTransactionPayTotalsMock.mockReturnValue({
        total: { usd: '123.456' },
        targetAmount: { usd: '0', fiat: '0' },
      } as unknown as TransactionPayTotals);
      useTransactionPayRequiredTokensMock.mockReturnValue([
        { amountUsd: '27.51', skipIfBalance: false },
      ] as unknown as ReturnType<typeof useTransactionPayRequiredTokens>);
    });

    it('falls back to the required token amount when the route needs no conversion', () => {
      useTransactionPayQuotesRawMock.mockReturnValue([
        { strategy: TransactionPayStrategy.None },
      ] as unknown as ReturnType<typeof useTransactionPayQuotesRaw>);

      const { getByText } = render();

      expect(getByText('$27.51')).toBeOnTheScreen();
    });

    it('falls back regardless of the required token address and chain', () => {
      // The no-op quote itself is the signal that nothing is converted, so the
      // row must not re-derive routing by comparing token address and chain.
      useTransactionPayQuotesRawMock.mockReturnValue([
        { strategy: TransactionPayStrategy.None },
      ] as unknown as ReturnType<typeof useTransactionPayQuotesRaw>);
      useTransactionPayRequiredTokensMock.mockReturnValue([
        {
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          amountUsd: '27.51',
          chainId: '0x1',
          skipIfBalance: false,
        },
      ] as unknown as ReturnType<typeof useTransactionPayRequiredTokens>);

      const { getByText } = render();

      expect(getByText('$27.51')).toBeOnTheScreen();
    });

    it('skips required tokens that are covered by balance', () => {
      useTransactionPayQuotesRawMock.mockReturnValue([
        { strategy: TransactionPayStrategy.None },
      ] as unknown as ReturnType<typeof useTransactionPayQuotesRaw>);
      useTransactionPayRequiredTokensMock.mockReturnValue([
        { amountUsd: '99.99', skipIfBalance: true },
        { amountUsd: '27.51', skipIfBalance: false },
      ] as unknown as ReturnType<typeof useTransactionPayRequiredTokens>);

      const { getByText } = render();

      expect(getByText('$27.51')).toBeOnTheScreen();
    });

    it('does not show the required amount when the route needs a conversion', () => {
      // A conversion route with no usable quote must not present the source
      // amount as the amount received.
      useTransactionPayQuotesRawMock.mockReturnValue([
        { strategy: TransactionPayStrategy.Relay },
      ] as unknown as ReturnType<typeof useTransactionPayQuotesRaw>);

      const { getByText, queryByText } = render();

      expect(getByText('$0')).toBeOnTheScreen();
      expect(queryByText('$27.51')).toBeNull();
    });

    it('does not show the required amount when there are no quotes at all', () => {
      useTransactionPayQuotesRawMock.mockReturnValue(
        undefined as unknown as ReturnType<typeof useTransactionPayQuotesRaw>,
      );

      const { getByText, queryByText } = render();

      expect(getByText('$0')).toBeOnTheScreen();
      expect(queryByText('$27.51')).toBeNull();
    });

    it('prefers the quote-derived target amount when one is available', () => {
      useTransactionPayTotalsMock.mockReturnValue({
        total: { usd: '123.456' },
        targetAmount: { usd: '99.38', fiat: '99.38' },
      } as unknown as TransactionPayTotals);
      useTransactionPayQuotesRawMock.mockReturnValue([
        { strategy: TransactionPayStrategy.None },
        { strategy: TransactionPayStrategy.Relay },
      ] as unknown as ReturnType<typeof useTransactionPayQuotesRaw>);

      const { getByText, queryByText } = render();

      expect(getByText(RECEIVE_FIAT_MOCK)).toBeOnTheScreen();
      expect(queryByText('$27.51')).toBeNull();
    });
  });

  describe('moneyAccountDeposit receive row', () => {
    it("renders You'll receive with two decimals and opens confirmation-local MoneyMusdInfoSheet on press for subsidized moneyAccountDeposit", () => {
      useIsPaidByMetaMaskMock.mockReturnValue(true);
      useTransactionPayTotalsMock.mockReturnValue({
        isInputBased: false,
        total: { usd: '100' },
        targetAmount: { usd: '100', fiat: '100' },
      } as unknown as TransactionPayTotals);

      const { getByTestId, getByText, queryByTestId } = render({
        type: TransactionType.moneyAccountDeposit,
      });

      expect(getByTestId('receive-row')).toBeOnTheScreen();
      expect(getByText("You'll receive")).toBeOnTheScreen();
      expect(queryByTestId('total-row')).toBeNull();
      expect(getByText('$100.00')).toBeOnTheScreen();
      expect(queryByTestId(MoneyMusdInfoSheetTestIds.CONTAINER)).toBeNull();

      fireEvent.press(getByTestId('receive-pressable'));

      expect(
        getByTestId(MoneyMusdInfoSheetTestIds.CONTAINER),
      ).toBeOnTheScreen();
      expect(getByTestId(MoneyMusdInfoSheetTestIds.TITLE)).toHaveTextContent(
        "You'll receive $100 of MetaMask USD",
      );
    });

    it('falls back to requiredTokens amountUsd when targetAmount is zero on subsidized moneyAccountDeposit', () => {
      useIsPaidByMetaMaskMock.mockReturnValue(true);
      useTransactionPayTotalsMock.mockReturnValue({
        total: { usd: '100' },
        targetAmount: { usd: '0', fiat: '0' },
      } as unknown as TransactionPayTotals);
      useTransactionPayRequiredTokensMock.mockReturnValue([
        { amountUsd: '100', skipIfBalance: false },
      ] as unknown as ReturnType<typeof useTransactionPayRequiredTokens>);

      const { getByText } = render({
        type: TransactionType.moneyAccountDeposit,
      });

      expect(getByText('$100.00')).toBeOnTheScreen();
    });

    it('does not wrap receive value in a pressable for non-moneyAccountDeposit flows', () => {
      useTransactionPayIsMaxAmountMock.mockReturnValue(true);

      const { queryByTestId } = render({
        type: TransactionType.perpsDeposit,
      });

      expect(queryByTestId('receive-pressable')).toBeNull();
    });

    it('formats receive row and sheet amounts using locale formatting via useFiatFormatter', () => {
      const originalLocale = I18n.locale;
      I18n.locale = 'pt-BR';

      try {
        useIsPaidByMetaMaskMock.mockReturnValue(true);
        useTransactionPayTotalsMock.mockReturnValue({
          total: { usd: '1000' },
          targetAmount: { usd: '1000', fiat: '1000' },
        } as unknown as TransactionPayTotals);

        const { getByTestId } = render({
          type: TransactionType.moneyAccountDeposit,
        });

        const receiveText = getByTestId('receive');
        expect(receiveText).toHaveTextContent(
          formatFiat(new BigNumber(1000), 'usd', 2),
        );

        fireEvent.press(getByTestId('receive-pressable'));

        expect(getByTestId(MoneyMusdInfoSheetTestIds.TITLE)).toHaveTextContent(
          `You'll receive ${formatFiat(new BigNumber(1000), 'usd')} of MetaMask USD`,
        );
      } finally {
        I18n.locale = originalLocale;
      }
    });
  });
});
