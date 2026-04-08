import { CHAIN_IDS } from '@metamask/transaction-controller';
import React from 'react';
import { render } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import { ARBITRUM_USDC, PERPS_CURRENCY } from '../../../constants/perps';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import { PerpsWithdrawInfo } from './perps-withdraw-info';

jest.mock('../../../hooks/pay/useTransactionPayWithdraw');
jest.mock('../../../hooks/ui/useNavbar');
jest.mock('../../../hooks/tokens/useAddToken');
jest.mock('../custom-amount-info', () => ({
  CustomAmountInfo: jest.fn(() => null),
}));
jest.mock('../../perps-confirmations/perps-withdraw-balance', () => ({
  PerpsWithdrawBalance: () => null,
}));

describe('PerpsWithdrawInfo', () => {
  const mockUseTransactionPayWithdraw = jest.mocked(useTransactionPayWithdraw);
  const mockUseAddToken = jest.mocked(useAddToken);
  const mockUseNavbar = jest.mocked(useNavbar);
  const mockCustomAmountInfo = jest.mocked(CustomAmountInfo);

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTransactionPayWithdraw.mockReturnValue({
      isWithdraw: true,
      canSelectWithdrawToken: true,
    });
  });

  it.each([
    { canSelectWithdrawToken: true, disablePay: false },
    { canSelectWithdrawToken: false, disablePay: true },
  ])(
    'passes disablePay=$disablePay to CustomAmountInfo when canSelectWithdrawToken=$canSelectWithdrawToken',
    ({ canSelectWithdrawToken, disablePay }) => {
      mockUseTransactionPayWithdraw.mockReturnValue({
        isWithdraw: true,
        canSelectWithdrawToken,
      });

      render(<PerpsWithdrawInfo />);

      expect(mockCustomAmountInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: PERPS_CURRENCY,
          disablePay,
        }),
        expect.anything(),
      );
    },
  );

  it('registers Arbitrum USDC and sets the Perps withdraw title', () => {
    render(<PerpsWithdrawInfo />);

    expect(mockUseNavbar).toHaveBeenCalledWith(
      strings('confirm.title.perps_withdraw'),
    );
    expect(mockUseAddToken).toHaveBeenCalledWith({
      chainId: CHAIN_IDS.ARBITRUM,
      decimals: ARBITRUM_USDC.decimals,
      name: ARBITRUM_USDC.name,
      symbol: ARBITRUM_USDC.symbol,
      tokenAddress: ARBITRUM_USDC.address,
    });
  });
});
