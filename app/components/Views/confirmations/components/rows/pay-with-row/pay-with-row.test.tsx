import React from 'react';
import { PayWithRow } from './pay-with-row';
import { TokenIconProps } from '../../token-icon';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import { useTransactionPayRequiredTokens } from '../../../hooks/pay/useTransactionPayData';
import { useTransactionPaySelectedFiatPaymentMethod } from '../../../hooks/pay/useTransactionPaySelectedFiatPaymentMethod';
import { useMoneyAccountPayToken } from '../../../hooks/pay/useMoneyAccountPayToken';
import { type PaymentMethod } from '@metamask/ramps-controller';
import { useNavigation } from '@react-navigation/native';
import { act, fireEvent } from '@testing-library/react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import { Text as MockText } from 'react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { isHardwareAccount } from '../../../../../../util/address';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';

jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../../hooks/pay/useTransactionPayToken');
jest.mock('../../../hooks/pay/useTransactionPayWithdraw');
jest.mock('../../../hooks/pay/useTransactionPayData');
jest.mock('../../../hooks/pay/useTransactionPaySelectedFiatPaymentMethod');
jest.mock('../../../hooks/pay/useMoneyAccountPayToken');
jest.mock('../../../../../../util/address');
jest.mock('../../../hooks/metrics/useConfirmationMetricEvents');

jest.mock('../../token-icon/', () => ({
  TokenIcon: (props: TokenIconProps) => (
    <MockText>{`${props.address} ${props.chainId}`}</MockText>
  ),
  TokenIconVariant: { Default: 'default', Row: 'row', Hero: 'hero' },
}));

const ADDRESS_MOCK = '0x1234567890abcdef1234567890abcdef12345678';
const CHAIN_ID_MOCK = '0x123';

const STATE_MOCK = {
  engine: {
    backgroundState,
  },
};

function render({ selectedAccount }: { selectedAccount?: string } = {}) {
  return renderWithProvider(<PayWithRow selectedAccount={selectedAccount} />, {
    state: STATE_MOCK,
  });
}

describe('PayWithRow', () => {
  const navigateMock = jest.fn();
  const isHardwareAccountMock = jest.mocked(isHardwareAccount);
  const useConfirmationMetricEventsMock = jest.mocked(
    useConfirmationMetricEvents,
  );
  const useTransactionPayWithdrawMock = jest.mocked(useTransactionPayWithdraw);
  const useTransactionPayRequiredTokensMock = jest.mocked(
    useTransactionPayRequiredTokens,
  );
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const useMoneyAccountPayTokenMock = jest.mocked(useMoneyAccountPayToken);
  const mockSetConfirmationMetric = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    useConfirmationMetricEventsMock.mockReturnValue({
      setConfirmationMetric: mockSetConfirmationMetric,
    } as never);

    useTransactionPayWithdrawMock.mockReturnValue({
      isWithdraw: false,
      canSelectWithdrawToken: false,
    });

    useTransactionPayRequiredTokensMock.mockReturnValue(undefined as never);

    jest
      .mocked(useTransactionPaySelectedFiatPaymentMethod)
      .mockReturnValue(undefined);

    jest.mocked(useTransactionPayToken).mockReturnValue({
      payToken: {
        address: ADDRESS_MOCK,
        balanceHuman: '0',
        balanceFiat: '$0',
        balanceRaw: '0',
        balanceUsd: '0',
        chainId: CHAIN_ID_MOCK,
        decimals: 4,
        symbol: 'test',
      },
      setPayToken: jest.fn(),
    });

    jest.mocked(useNavigation).mockReturnValue({
      navigate: navigateMock,
    } as never);

    isHardwareAccountMock.mockReturnValue(false);

    useMoneyAccountPayTokenMock.mockReturnValue({
      displayToken: undefined,
      isAwaitingAccountSelection: false,
      isMoneyAccountDeposit: false,
      isMoneyAccountWithdraw: false,
    });
  });

  it('renders selected pay token', async () => {
    const { getByText } = render();
    expect(getByText(`${ADDRESS_MOCK} ${CHAIN_ID_MOCK}`)).toBeDefined();
  });

  it('navigates to token picker on token pill click', async () => {
    const { getByText } = render();

    await act(() => {
      fireEvent.press(getByText(`${ADDRESS_MOCK} ${CHAIN_ID_MOCK}`));
    });

    expect(navigateMock).toHaveBeenCalledWith(
      Routes.CONFIRMATION_PAY_WITH_MODAL,
    );
  });

  it('renders skeleton when no pay token selected', () => {
    jest.mocked(useTransactionPayToken).mockReturnValue({
      payToken: undefined,
      setPayToken: jest.fn(),
    });

    const { getByTestId } = render();

    expect(getByTestId('pay-with-row-skeleton')).toBeDefined();
  });

  it('disables edit if hardware wallet', async () => {
    isHardwareAccountMock.mockReturnValue(true);

    const { getByText } = render();

    await act(() => {
      fireEvent.press(getByText(`${ADDRESS_MOCK} ${CHAIN_ID_MOCK}`));
    });

    expect(navigateMock).not.toHaveBeenCalled();
  });

  describe('metrics', () => {
    it('sets mm_pay_token_list_opened when pay with row pressed', async () => {
      const { getByText } = render();

      await act(() => {
        fireEvent.press(getByText(`${ADDRESS_MOCK} ${CHAIN_ID_MOCK}`));
      });

      expect(mockSetConfirmationMetric).toHaveBeenCalledWith({
        properties: {
          mm_pay_token_list_opened: true,
        },
      });
    });
  });

  describe('withdraw mode', () => {
    beforeEach(() => {
      useTransactionPayWithdrawMock.mockReturnValue({
        isWithdraw: true,
        canSelectWithdrawToken: true,
      });
    });

    it('shows "Receive" label instead of "Pay with"', () => {
      const { getByText } = render();
      expect(getByText('Receive')).toBeDefined();
      expect(getByText('test')).toBeDefined();
    });

    it('hides balance in withdraw mode', () => {
      const { queryByTestId } = render();
      expect(queryByTestId('pay-with-balance')).toBeNull();
    });

    it('falls back to default required token when no payToken is selected', () => {
      jest.mocked(useTransactionPayToken).mockReturnValue({
        payToken: undefined,
        setPayToken: jest.fn(),
      });

      const requiredAddress = '0xRequiredTokenAddress';
      const requiredChainId = '0x89';
      useTransactionPayRequiredTokensMock.mockReturnValue([
        {
          address: requiredAddress,
          chainId: requiredChainId,
          symbol: 'USDC.e',
        },
      ] as never);

      const { getByText } = render();
      expect(getByText(`${requiredAddress} ${requiredChainId}`)).toBeDefined();
    });

    it('shows skeleton when no payToken and no required token in withdraw mode', () => {
      jest.mocked(useTransactionPayToken).mockReturnValue({
        payToken: undefined,
        setPayToken: jest.fn(),
      });

      useTransactionPayRequiredTokensMock.mockReturnValue(undefined as never);

      const { getByTestId } = render();
      expect(getByTestId('pay-with-row-skeleton')).toBeDefined();
    });
  });

  describe('fiat payment method', () => {
    const FIAT_PAYMENT_METHOD_MOCK = {
      id: 'pm-card',
      paymentType: 'debit-credit-card',
      name: 'Credit Card',
      score: 1,
      icon: 'card-icon',
    } as PaymentMethod;

    it('renders fiat payment method row when selected', () => {
      jest
        .mocked(useTransactionPaySelectedFiatPaymentMethod)
        .mockReturnValue(FIAT_PAYMENT_METHOD_MOCK);

      const { getByText } = render();

      expect(getByText('Pay with')).toBeDefined();
      expect(getByText('Credit Card')).toBeDefined();
    });

    it('navigates to modal when fiat payment method row is pressed', async () => {
      jest
        .mocked(useTransactionPaySelectedFiatPaymentMethod)
        .mockReturnValue(FIAT_PAYMENT_METHOD_MOCK);

      const { getByText } = render();

      await act(() => {
        fireEvent.press(getByText('Credit Card'));
      });

      expect(navigateMock).toHaveBeenCalledWith(
        Routes.CONFIRMATION_PAY_WITH_MODAL,
      );
    });
  });

  describe('money account', () => {
    it('renders awaiting account selection placeholder when isAwaitingAccountSelection is true', () => {
      useMoneyAccountPayTokenMock.mockReturnValue({
        displayToken: undefined,
        isAwaitingAccountSelection: true,
        isMoneyAccountDeposit: true,
        isMoneyAccountWithdraw: false,
      });

      const { getByTestId } = render();

      expect(getByTestId('pay-with')).toBeOnTheScreen();
    });

    it('does not navigate when isAwaitingAccountSelection is true and row is pressed', async () => {
      useMoneyAccountPayTokenMock.mockReturnValue({
        displayToken: undefined,
        isAwaitingAccountSelection: true,
        isMoneyAccountDeposit: true,
        isMoneyAccountWithdraw: false,
      });

      const { getByTestId } = render();

      await act(async () => {
        fireEvent.press(getByTestId('pay-with'));
      });

      expect(navigateMock).not.toHaveBeenCalled();
    });

    it('uses moneyAccountDisplayToken when provided, taking priority over payToken', () => {
      const MONEY_ACCOUNT_ADDRESS = '0xMoneyAccountToken1234567890abcdef123456';
      const MONEY_ACCOUNT_CHAIN_ID = '0x1';

      useMoneyAccountPayTokenMock.mockReturnValue({
        displayToken: {
          address: MONEY_ACCOUNT_ADDRESS,
          chainId: MONEY_ACCOUNT_CHAIN_ID,
          symbol: 'mUSD',
          decimals: 18,
        },
        isAwaitingAccountSelection: false,
        isMoneyAccountDeposit: false,
        isMoneyAccountWithdraw: true,
      });

      const { getByText } = render();

      expect(
        getByText(`${MONEY_ACCOUNT_ADDRESS} ${MONEY_ACCOUNT_CHAIN_ID}`),
      ).toBeOnTheScreen();
    });

    it('passes selectedAccount to useMoneyAccountPayToken', () => {
      const SELECTED_ACCOUNT = '0xSelectedAccount1234567890abcdef12345678';

      render({ selectedAccount: SELECTED_ACCOUNT });

      expect(useMoneyAccountPayTokenMock).toHaveBeenCalledWith(
        SELECTED_ACCOUNT,
      );
    });
  });

  describe('from address change', () => {
    beforeEach(() => {
      useTransactionMetadataRequestMock.mockReturnValue({
        txParams: { from: '0xFromAddress' },
      } as never);
    });

    it('navigates to token picker after from address changes', async () => {
      const { rerender, getByText } = render();

      useTransactionMetadataRequestMock.mockReturnValue({
        txParams: { from: '0xDifferentAddress' },
      } as never);

      await act(async () => {
        rerender(<PayWithRow />);
      });

      await act(async () => {
        fireEvent.press(getByText(`${ADDRESS_MOCK} ${CHAIN_ID_MOCK}`));
      });

      expect(navigateMock).toHaveBeenCalledWith(
        Routes.CONFIRMATION_PAY_WITH_MODAL,
      );
    });

    it('shows skeleton when payToken clears after from address change', async () => {
      const { rerender, getByTestId } = render();

      useTransactionMetadataRequestMock.mockReturnValue({
        txParams: { from: '0xDifferentAddress' },
      } as never);

      jest.mocked(useTransactionPayToken).mockReturnValue({
        payToken: undefined,
        setPayToken: jest.fn(),
      });

      await act(async () => {
        rerender(<PayWithRow />);
      });

      expect(getByTestId('pay-with-row-skeleton')).toBeDefined();
    });
  });
});
