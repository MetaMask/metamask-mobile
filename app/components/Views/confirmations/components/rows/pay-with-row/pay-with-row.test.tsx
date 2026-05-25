import React from 'react';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { PayWithRow } from './pay-with-row';
import { TokenIconProps } from '../../token-icon';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import { useTransactionPayRequiredTokens } from '../../../hooks/pay/useTransactionPayData';
import { useTransactionPaySelectedFiatPaymentMethod } from '../../../hooks/pay/useTransactionPaySelectedFiatPaymentMethod';
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
import { useParams } from '../../../../../../util/navigation/navUtils';

jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../../../../../util/navigation/navUtils');
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../../hooks/pay/useTransactionPayToken');
jest.mock('../../../hooks/pay/useTransactionPayWithdraw');
jest.mock('../../../hooks/pay/useTransactionPayData');
jest.mock('../../../hooks/pay/useTransactionPaySelectedFiatPaymentMethod');
jest.mock('../../../../../../util/address');
jest.mock('../../../hooks/metrics/useConfirmationMetricEvents');
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../../hooks/pay/useTransactionPayToken', () => ({
  useTransactionPayToken: jest.fn(),
}));
jest.mock('../../../hooks/pay/useTransactionPayWithdraw', () => ({
  useTransactionPayWithdraw: jest.fn(),
}));
jest.mock('../../../hooks/pay/useTransactionPayData', () => ({
  useTransactionPayRequiredTokens: jest.fn(),
}));
jest.mock(
  '../../../hooks/pay/useTransactionPaySelectedFiatPaymentMethod',
  () => ({
    useTransactionPaySelectedFiatPaymentMethod: jest.fn(),
  }),
);
jest.mock('../../../../../../util/address');
jest.mock('../../../hooks/metrics/useConfirmationMetricEvents', () => ({
  useConfirmationMetricEvents: jest.fn(),
}));

jest.mock('../../token-icon/', () => ({
  TokenIcon: (props: TokenIconProps) => (
    <>
      <MockText>{`${props.address} ${props.chainId}`}</MockText>
      <MockText testID="token-icon-symbol">
        {`icon-symbol:${props.symbol ?? ''}`}
      </MockText>
    </>
  ),
  TokenIconVariant: { Default: 'default', Row: 'row', Hero: 'hero' },
}));

const ADDRESS_MOCK = '0x1234567890abcdef1234567890abcdef12345678';
const CHAIN_ID_MOCK = '0x123';

const TRANSACTION_ID_MOCK = 'tx-id';

const STATE_MOCK = {
  engine: {
    backgroundState,
  },
};

const STATE_MONEY_ACCOUNT_MOCK = {
  engine: {
    backgroundState: {
      ...backgroundState,
      TransactionPayController: {
        transactionData: {
          [TRANSACTION_ID_MOCK]: {
            paymentOverride: PaymentOverride.MoneyAccount,
          },
        },
      },
    },
  },
} as unknown as typeof STATE_MOCK;

function render(state = STATE_MOCK) {
  return renderWithProvider(<PayWithRow />, { state });
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
  const useParamsMock = jest.mocked(useParams);
  const mockSetConfirmationMetric = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    useParamsMock.mockReturnValue({});

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

    it('passes the receive token symbol to the token icon', () => {
      const { getByTestId } = render();
      expect(getByTestId('token-icon-symbol')).toHaveTextContent(
        'icon-symbol:test',
      );
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

  describe('locked view (money account)', () => {
    beforeEach(() => {
      jest.mocked(useTransactionMetadataRequest).mockReturnValue({
        id: TRANSACTION_ID_MOCK,
        txParams: { from: '0xabc' },
      } as never);
    });

    it('renders locked view with Pay with label and token symbol when paymentOverride is true', () => {
      const { getByText, getByTestId } = render(STATE_MONEY_ACCOUNT_MOCK);

      expect(getByText('Pay with')).toBeDefined();
      expect(getByTestId('pay-with-symbol')).toBeDefined();
    });

    it('shows balance in locked view', () => {
      const { getByTestId } = render(STATE_MONEY_ACCOUNT_MOCK);

      expect(getByTestId('pay-with-balance')).toBeDefined();
    });

    it('does not navigate when locked view is rendered', async () => {
      const { getByText } = render(STATE_MONEY_ACCOUNT_MOCK);

      await act(() => {
        fireEvent.press(getByText('Pay with'));
      });

      expect(navigateMock).not.toHaveBeenCalled();
    });

    it('shows skeleton when paymentOverride is true but payToken is not set yet', () => {
      jest.mocked(useTransactionPayToken).mockReturnValue({
        payToken: undefined,
        setPayToken: jest.fn(),
      });

      const { getByTestId } = render(STATE_MONEY_ACCOUNT_MOCK);

      expect(getByTestId('pay-with-row-skeleton')).toBeDefined();
    });

    it('renders interactive view when paymentOverride is false', () => {
      jest.mocked(useTransactionMetadataRequest).mockReturnValue({
        id: TRANSACTION_ID_MOCK,
        txParams: { from: '0xabc' },
      } as never);

      const { getByText } = render(STATE_MOCK);

      expect(getByText('Pay with')).toBeDefined();
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
});
