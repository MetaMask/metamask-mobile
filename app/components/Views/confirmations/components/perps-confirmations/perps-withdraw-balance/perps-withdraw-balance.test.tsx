import React from 'react';
import { render } from '@testing-library/react-native';
import { TransactionType } from '@metamask/transaction-controller';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import { usePerpsLiveAccount } from '../../../../../UI/Perps/hooks/stream/usePerpsLiveAccount';
import { useLighterWithdrawableBalance } from '../../../temp-lighter/useLighterWithdrawableBalance';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { PerpsWithdrawBalance } from './perps-withdraw-balance';

jest.mock('../../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(),
}));
jest.mock('../../../../../UI/Perps/hooks/stream/usePerpsLiveAccount');
jest.mock('../../../temp-lighter/useLighterWithdrawableBalance');
jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');

const mockUseStyles = jest.mocked(useStyles);
const mockUsePerpsLiveAccount = jest.mocked(usePerpsLiveAccount);
const mockUseLighterWithdrawableBalance = jest.mocked(
  useLighterWithdrawableBalance,
);
const mockUseTransactionMetadataRequest = jest.mocked(
  useTransactionMetadataRequest,
);

function renderComponent() {
  return render(<PerpsWithdrawBalance />);
}

describe('PerpsWithdrawBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTransactionMetadataRequest.mockReturnValue({
      id: 'tx-1',
      type: TransactionType.perpsWithdraw,
    } as never);
    mockUseStyles.mockReturnValue({
      styles: {
        container: {},
      },
    } as never);
    mockUsePerpsLiveAccount.mockReturnValue({
      account: {
        spendableBalance: '$1,232.39',
        withdrawableBalance: '$1,232.39',
      },
      isInitialLoading: false,
    } as never);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders the formatted Perps balance', () => {
    const { getByText } = renderComponent();

    expect(
      getByText(`${strings('confirm.available_balance')}$1,232.39`),
    ).toBeOnTheScreen();
  });

  it('truncates 3+ decimal balances down to 2 decimals so the displayed value matches the Max button', () => {
    // Without truncation, Intl.NumberFormat rounds half-up and would show
    // $50.39 for an underlying 50.389 balance, one cent higher than the
    // Max button computed via BigNumber.ROUND_DOWN.
    mockUsePerpsLiveAccount.mockReturnValue({
      account: { withdrawableBalance: '50.389' },
      isInitialLoading: false,
    } as never);

    const { getByText } = renderComponent();

    expect(
      getByText(`${strings('confirm.available_balance')}$50.38`),
    ).toBeOnTheScreen();
  });

  it('renders a zero balance when the live account has no available balance', () => {
    mockUsePerpsLiveAccount.mockReturnValue({
      account: null,
      isInitialLoading: false,
    } as never);

    const { getByText } = renderComponent();

    expect(
      getByText(`${strings('confirm.available_balance')}$0`),
    ).toBeOnTheScreen();
  });

  describe('for a Lighter withdraw', () => {
    beforeEach(() => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        id: 'tx-1',
        type: TransactionType.perpsLighterWithdraw,
        txParams: { from: '0xabc' },
      } as never);
    });

    it('renders the Lighter withdrawable balance instead of the Hyperliquid one', () => {
      mockUseLighterWithdrawableBalance.mockReturnValue('5.579');

      const { getByText } = renderComponent();

      expect(
        getByText(`${strings('confirm.available_balance')}$5.57`),
      ).toBeOnTheScreen();
      expect(mockUseLighterWithdrawableBalance).toHaveBeenCalledWith(
        '0xabc',
        true,
      );
    });

    it('renders a zero balance until the Lighter balance loads', () => {
      mockUseLighterWithdrawableBalance.mockReturnValue(undefined);

      const { getByText } = renderComponent();

      expect(
        getByText(`${strings('confirm.available_balance')}$0`),
      ).toBeOnTheScreen();
    });
  });
});
