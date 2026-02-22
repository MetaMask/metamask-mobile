import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { PerpsPayRow } from './PerpsPayRow';
import { useNavigation } from '@react-navigation/native';
import { useTransactionPayToken } from '../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { useTransactionMetadataRequest } from '../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { useIsPerpsBalanceSelected } from '../../hooks/useIsPerpsBalanceSelected';
import { useTokenWithBalance } from '../../../../Views/confirmations/hooks/tokens/useTokenWithBalance';
import { useConfirmationMetricEvents } from '../../../../Views/confirmations/hooks/metrics/useConfirmationMetricEvents';
import { isHardwareAccount } from '../../../../../util/address';
import Routes from '../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  ConfirmationRowComponentIDs,
  TransactionPayComponentIDs,
} from '../../../../Views/confirmations/ConfirmationView.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../../../Views/confirmations/hooks/pay/useTransactionPayToken');
jest.mock(
  '../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest',
);
jest.mock('../../hooks/useIsPerpsBalanceSelected');
jest.mock('../../../../Views/confirmations/hooks/tokens/useTokenWithBalance');
jest.mock(
  '../../../../Views/confirmations/hooks/metrics/useConfirmationMetricEvents',
);
jest.mock('../../../../../util/address');
jest.mock('../../../../Base/TokenIcon', () => jest.fn(() => null));
jest.mock('../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'network-icon.png' })),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseTransactionPayToken =
  useTransactionPayToken as jest.MockedFunction<typeof useTransactionPayToken>;
const mockUseTransactionMetadataRequest =
  useTransactionMetadataRequest as jest.MockedFunction<
    typeof useTransactionMetadataRequest
  >;
const mockUseIsPerpsBalanceSelected =
  useIsPerpsBalanceSelected as jest.MockedFunction<
    typeof useIsPerpsBalanceSelected
  >;
const mockUseTokenWithBalance = useTokenWithBalance as jest.MockedFunction<
  typeof useTokenWithBalance
>;
const mockUseConfirmationMetricEvents =
  useConfirmationMetricEvents as jest.MockedFunction<
    typeof useConfirmationMetricEvents
  >;
const mockIsHardwareAccount = isHardwareAccount as jest.MockedFunction<
  typeof isHardwareAccount
>;

describe('PerpsPayRow', () => {
  const navigateMock = jest.fn();
  const setConfirmationMetricMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({
      navigate: navigateMock,
    } as unknown as ReturnType<typeof useNavigation>);
    mockUseTransactionMetadataRequest.mockReturnValue({
      txParams: { from: '0x123' },
    } as ReturnType<typeof useTransactionMetadataRequest>);
    mockUseTransactionPayToken.mockReturnValue({
      payToken: {
        address: '0xusdc',
        chainId: '0xa4b1',
        symbol: 'USDC',
      },
      setPayToken: jest.fn(),
    } as unknown as ReturnType<typeof useTransactionPayToken>);
    mockUseIsPerpsBalanceSelected.mockReturnValue(false);
    mockUseTokenWithBalance.mockReturnValue({
      address: '0xusdc',
      symbol: 'USDC',
      image: 'https://example.com/usdc.png',
    } as unknown as ReturnType<typeof useTokenWithBalance>);
    mockUseConfirmationMetricEvents.mockReturnValue({
      setConfirmationMetric: setConfirmationMetricMock,
    } as unknown as ReturnType<typeof useConfirmationMetricEvents>);
    mockIsHardwareAccount.mockReturnValue(false);
  });

  it('renders pay with label', () => {
    const { getByText } = renderWithProvider(<PerpsPayRow />);

    expect(getByText('confirm.label.pay_with')).toBeOnTheScreen();
  });

  it('renders perps balance label when perps balance is selected', () => {
    mockUseIsPerpsBalanceSelected.mockReturnValue(true);

    const { getByTestId } = renderWithProvider(<PerpsPayRow />);

    expect(
      getByTestId(TransactionPayComponentIDs.PAY_WITH_SYMBOL),
    ).toHaveTextContent('perps.adjust_margin.perps_balance');
  });

  it('renders pay token symbol when perps balance is not selected', () => {
    mockUseIsPerpsBalanceSelected.mockReturnValue(false);
    mockUseTransactionPayToken.mockReturnValue({
      payToken: { address: '0xusdc', chainId: '0xa4b1', symbol: 'USDC' },
      setPayToken: jest.fn(),
    } as unknown as ReturnType<typeof useTransactionPayToken>);

    const { getByTestId } = renderWithProvider(<PerpsPayRow />);

    expect(
      getByTestId(TransactionPayComponentIDs.PAY_WITH_SYMBOL),
    ).toHaveTextContent('USDC');
  });

  it('navigates to pay with modal when row is pressed and not hardware account', () => {
    const { getByTestId } = renderWithProvider(<PerpsPayRow />);

    fireEvent.press(getByTestId(ConfirmationRowComponentIDs.PAY_WITH));

    expect(navigateMock).toHaveBeenCalledWith(
      Routes.CONFIRMATION_PAY_WITH_MODAL,
    );
    expect(setConfirmationMetricMock).toHaveBeenCalledWith({
      properties: { mm_pay_token_list_opened: true },
    });
  });

  it('does not navigate when hardware account', () => {
    mockIsHardwareAccount.mockReturnValue(true);

    const { getByTestId } = renderWithProvider(<PerpsPayRow />);

    fireEvent.press(getByTestId(ConfirmationRowComponentIDs.PAY_WITH));

    expect(navigateMock).not.toHaveBeenCalled();
    expect(setConfirmationMetricMock).not.toHaveBeenCalled();
  });

  it('calls onPayWithInfoPress when info icon is pressed', () => {
    const onPayWithInfoPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <PerpsPayRow onPayWithInfoPress={onPayWithInfoPress} />,
    );

    fireEvent.press(getByTestId('perps-pay-row-info'));

    expect(onPayWithInfoPress).toHaveBeenCalledTimes(1);
  });

  it('renders with embedded style when embeddedInStack is true', () => {
    const { getByTestId } = renderWithProvider(<PerpsPayRow embeddedInStack />);

    expect(getByTestId(ConfirmationRowComponentIDs.PAY_WITH)).toBeOnTheScreen();
  });
});
