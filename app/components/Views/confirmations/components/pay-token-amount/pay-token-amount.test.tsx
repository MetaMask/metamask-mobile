import React from 'react';
import { merge } from 'lodash';
import { TransactionType } from '@metamask/transaction-controller';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PayTokenAmount } from './pay-token-amount';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { useTokenFiatRates } from '../../hooks/tokens/useTokenFiatRates';
import { useTransactionPayToken } from '../../hooks/pay/useTransactionPayToken';
import {
  useTransactionPayIsMaxAmount,
  useIsTransactionPayLoading,
} from '../../hooks/pay/useTransactionPayData';

jest.mock('../../hooks/useTokenAmount');
jest.mock('../../hooks/useTokenAsset');
jest.mock('../../hooks/tokens/useTokenFiatRates');
jest.mock('../../hooks/pay/useTransactionPayToken');
jest.mock('../../hooks/pay/useTransactionPayData');

const ASSET_AMOUNT_MOCK = '100';
const ASSET_FIAT_RATE_MOCK = 10;
const PAY_TOKEN_FIAT_RATE_MOCK = 2;
const PAY_TOKEN_SYMBOL_MOCK = 'TST';
const CHAIN_ID_2_MOCK = '0x456';
const ADDRESS_2_MOCK = '0xdef';

function render({
  disabled = false,
  transactionType,
}: { disabled?: boolean; transactionType?: TransactionType } = {}) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    otherControllersMock,
  );

  if (transactionType) {
    state.engine.backgroundState.TransactionController.transactions[0].type =
      transactionType;
  }

  return renderWithProvider(
    <PayTokenAmount amountHuman={ASSET_AMOUNT_MOCK} disabled={disabled} />,
    {
      state,
    },
  );
}

describe('PayTokenAmount', () => {
  const useTokenFiatRatesMock = jest.mocked(useTokenFiatRates);
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useTransactionPayIsMaxAmountMock = jest.mocked(
    useTransactionPayIsMaxAmount,
  );
  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTokenFiatRatesMock.mockReturnValue([
      PAY_TOKEN_FIAT_RATE_MOCK,
      ASSET_FIAT_RATE_MOCK,
    ]);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: {
        chainId: CHAIN_ID_2_MOCK,
        address: ADDRESS_2_MOCK,
        symbol: PAY_TOKEN_SYMBOL_MOCK,
      },
    } as unknown as ReturnType<typeof useTransactionPayToken>);

    useTransactionPayIsMaxAmountMock.mockReturnValue(false);
    useIsTransactionPayLoadingMock.mockReturnValue(false);
  });

  it('renders equivalent pay token value', () => {
    const { getByText } = render();
    expect(getByText('500', { exact: false })).toBeDefined();
  });

  it('renders pay token symbol', () => {
    const { getByText } = render();
    expect(getByText(PAY_TOKEN_SYMBOL_MOCK, { exact: false })).toBeDefined();
  });

  it('renders skeleton if missing fiat rate', () => {
    useTokenFiatRatesMock.mockReturnValue([undefined, undefined]);

    const { getByTestId } = render();

    expect(getByTestId('pay-token-amount-skeleton')).toBeDefined();
  });

  it('returns fixed value if disabled', () => {
    const { getByText } = render({ disabled: true });
    expect(getByText('0 ETH')).toBeDefined();
  });

  it('renders skeleton if isMaxAmount and quotes loading', () => {
    useTransactionPayIsMaxAmountMock.mockReturnValue(true);
    useIsTransactionPayLoadingMock.mockReturnValue(true);

    const { getByTestId } = render();

    expect(getByTestId('pay-token-amount-skeleton')).toBeDefined();
  });

  it('returns null for withdrawal transactions', () => {
    const { queryByTestId, queryByText } = render({
      transactionType: TransactionType.predictWithdraw,
    });

    expect(queryByTestId('pay-token-amount')).toBeNull();
    expect(queryByTestId('pay-token-amount-skeleton')).toBeNull();
    expect(queryByText(PAY_TOKEN_SYMBOL_MOCK)).toBeNull();
  });
});
