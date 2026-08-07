import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { merge } from 'lodash';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { CustomAmountBuy } from './custom-amount-buy';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { useRampNavigation } from '../../../../../UI/Ramp/hooks/useRampNavigation';
import { useAccountTokens } from '../../../hooks/send/useAccountTokens';
import { useTransactionPayRequiredTokens } from '../../../hooks/pay/useTransactionPayData';
import { strings } from '../../../../../../../locales/i18n';
import { AssetType } from '../../../types/token';
import { TransactionPayRequiredToken } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';

jest.mock('../../../../../UI/Ramp/hooks/useRampNavigation');
jest.mock('../../../hooks/send/useAccountTokens');
jest.mock('../../../hooks/pay/useTransactionPayData');

const mockGoToBuy = jest.fn();

const TOKEN_ADDRESS_MOCK = '0x123' as Hex;
const CHAIN_ID_MOCK = '0x1' as Hex;

function render() {
  return renderWithProvider(<CustomAmountBuy />, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
    ),
  });
}

describe('CustomAmountBuy', () => {
  const useRampNavigationMock = jest.mocked(useRampNavigation);
  const useAccountTokensMock = jest.mocked(useAccountTokens);
  const useTransactionPayRequiredTokensMock = jest.mocked(
    useTransactionPayRequiredTokens,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useRampNavigationMock.mockReturnValue({
      goToBuy: mockGoToBuy,
    } as never);

    useAccountTokensMock.mockReturnValue([]);
    useTransactionPayRequiredTokensMock.mockReturnValue([]);
  });

  it('renders the buy button text', () => {
    const { getByText } = render();

    expect(
      getByText(strings('confirm.custom_amount.buy_button')),
    ).toBeOnTheScreen();
  });

  it('calls goToBuy when the buy button is pressed', () => {
    useAccountTokensMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_MOCK,
        assetId: TOKEN_ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
      } as AssetType,
    ]);

    useTransactionPayRequiredTokensMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
      },
    ] as TransactionPayRequiredToken[]);

    const { getByText } = render();

    fireEvent.press(getByText(strings('confirm.custom_amount.buy_button')));

    expect(mockGoToBuy).toHaveBeenCalledTimes(1);
    expect(mockGoToBuy).toHaveBeenCalledWith(
      {
        assetId: 'eip155:1/erc20:0x123',
      },
      { surface: 'confirmation' },
    );
  });
});
