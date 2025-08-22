import React from 'react';
import { merge } from 'lodash';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PayTokenAmount } from './pay-token-amount';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { useTokenAmount } from '../../hooks/useTokenAmount';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { useTokenAsset } from '../../hooks/useTokenAsset';
import { useTokenFiatRates } from '../../hooks/tokens/useTokenFiatRates';
import { useTransactionPayToken } from '../../hooks/pay/useTransactionPayToken';

jest.mock('../../hooks/useTokenAmount');
jest.mock('../../hooks/useTokenAsset');
jest.mock('../../hooks/tokens/useTokenFiatRates');
jest.mock('../../hooks/pay/useTransactionPayToken');

function render() {
  return renderWithProvider(<PayTokenAmount />, {
    state: merge(
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
    ),
  });
}

const ASSET_AMOUNT_MOCK = '100';
const ASSET_FIAT_RATE_MOCK = 10;
const PAY_TOKEN_FIAT_RATE_MOCK = 2;
const PAY_TOKEN_SYMBOL_MOCK = 'TST';
const CHAIN_ID_1_MOCK = '0x123';
const CHAIN_ID_2_MOCK = '0x456';
const ADDRESS_1_MOCK = '0xabc';
const ADDRESS_2_MOCK = '0xdef';

describe('PayTokenAmount', () => {
  const useTokenAmountMock = jest.mocked(useTokenAmount);
  const useTokenAssetMock = jest.mocked(useTokenAsset);
  const useTokenFiatRatesMock = jest.mocked(useTokenFiatRates);
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);

  beforeEach(() => {
    jest.resetAllMocks();

    useTokenAmountMock.mockReturnValue({
      amountUnformatted: ASSET_AMOUNT_MOCK,
    } as unknown as ReturnType<typeof useTokenAmount>);

    useTokenAssetMock.mockReturnValue({
      asset: {
        chainId: CHAIN_ID_1_MOCK,
        address: ADDRESS_1_MOCK,
      },
    } as unknown as ReturnType<typeof useTokenAsset>);

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

  it('renders nothing if missing fiat rate', () => {
    useTokenFiatRatesMock.mockReturnValue([undefined, undefined]);

    const { queryByTestId } = render();

    expect(queryByTestId('pay-token-amount')).toBeNull();
  });
});
