import React from 'react';
import { merge } from 'lodash';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PayTokenAmount } from './pay-token-amount';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { useTokenFiatRates } from '../../hooks/tokens/useTokenFiatRates';
import { useTransactionPayToken } from '../../hooks/pay/useTransactionPayToken';

jest.mock('../../hooks/useTokenAmount');
jest.mock('../../hooks/useTokenAsset');
jest.mock('../../hooks/tokens/useTokenFiatRates');
jest.mock('../../hooks/pay/useTransactionPayToken');

const ASSET_AMOUNT_MOCK = '100';
const ASSET_FIAT_RATE_MOCK = 10;
const PAY_TOKEN_FIAT_RATE_MOCK = 2;
const PAY_TOKEN_SYMBOL_MOCK = 'TST';
const CHAIN_ID_2_MOCK = '0x456';
const ADDRESS_2_MOCK = '0xdef';

function render() {
  return renderWithProvider(
    <PayTokenAmount amountHuman={ASSET_AMOUNT_MOCK} />,
    {
      state: merge(
        simpleSendTransactionControllerMock,
        transactionApprovalControllerMock,
        otherControllersMock,
      ),
    },
  );
}

describe('PayTokenAmount', () => {
  const useTokenFiatRatesMock = jest.mocked(useTokenFiatRates);
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);

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
});
