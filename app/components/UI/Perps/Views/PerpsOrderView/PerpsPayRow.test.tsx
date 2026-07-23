import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { PerpsPayRow } from './PerpsPayRow';
import { useNavigation } from '@react-navigation/native';
import { useTransactionPayToken } from '../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { useTransactionMetadataRequest } from '../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { useIsPerpsBalanceSelected } from '../../hooks/useIsPerpsBalanceSelected';
import { useTokenWithBalance } from '../../../../Views/confirmations/hooks/tokens/useTokenWithBalance';
import { useConfirmationMetricEvents } from '../../../../Views/confirmations/hooks/metrics/useConfirmationMetricEvents';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import {
  markPerpsPaymentTokenSelection,
  resetPerpsPaymentTokenSelection,
} from '../../utils/perpsPaymentTokenSelection';
import { isHardwareAccount } from '../../../../../util/address';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
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
  // Run the focus callback on every render so dismiss detection is testable.
  useFocusEffect: jest.fn((callback) => callback()),
}));

jest.mock('../../../../Views/confirmations/hooks/pay/useTransactionPayToken');
jest.mock(
  '../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest',
);
jest.mock('../../hooks/useIsPerpsBalanceSelected', () => ({
  useIsPerpsBalanceSelected: jest.fn(),
}));
jest.mock('../../../../Views/confirmations/hooks/tokens/useTokenWithBalance');
jest.mock(
  '../../../../Views/confirmations/hooks/metrics/useConfirmationMetricEvents',
);
jest.mock('../../hooks/usePerpsEventTracking');
jest.mock('../../../../../util/address');
jest.mock('../../../../Base/TokenIcon', () => jest.fn(() => null));
jest.mock('../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../util/networks'),
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
const mockUsePerpsEventTracking = usePerpsEventTracking as jest.MockedFunction<
  typeof usePerpsEventTracking
>;
const mockIsHardwareAccount = isHardwareAccount as jest.MockedFunction<
  typeof isHardwareAccount
>;

describe('PerpsPayRow', () => {
  const navigateMock = jest.fn();
  const setConfirmationMetricMock = jest.fn();
  const trackMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    resetPerpsPaymentTokenSelection();
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
    mockUsePerpsEventTracking.mockReturnValue({
      track: trackMock,
    } as unknown as ReturnType<typeof usePerpsEventTracking>);
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

  it('navigates to pay with bottom sheet when row is pressed and not hardware account', () => {
    const { getByTestId } = renderWithProvider(<PerpsPayRow />);

    fireEvent.press(getByTestId(ConfirmationRowComponentIDs.PAY_WITH));

    expect(navigateMock).toHaveBeenCalledWith(
      Routes.CONFIRMATION_PAY_WITH_BOTTOM_SHEET,
    );
    expect(setConfirmationMetricMock).toHaveBeenCalledWith({
      properties: { mm_pay_token_list_opened: true },
    });
    expect(trackMock).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.PAYMENT_TOKEN_SELECTOR,
      },
    );
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

  describe('payment token selector dismissal', () => {
    const dismissedCall = [
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      expect.objectContaining({
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.PAYMENT_TOKEN_SELECTOR_DISMISSED,
      }),
    ];

    const setPayToken = (token: {
      address: string;
      chainId: string;
      symbol: string;
    }) =>
      mockUseTransactionPayToken.mockReturnValue({
        payToken: token,
        setPayToken: jest.fn(),
      } as unknown as ReturnType<typeof useTransactionPayToken>);

    it('emits payment_token_selector_dismissed when the selector closes with the token unchanged', () => {
      const usdc = { address: '0xusdc', chainId: '0xa4b1', symbol: 'USDC' };
      setPayToken(usdc);
      const { getByTestId, rerender } = renderWithProvider(<PerpsPayRow />);

      // Open the selector, then return to the screen with the same token.
      fireEvent.press(getByTestId(ConfirmationRowComponentIDs.PAY_WITH));
      rerender(<PerpsPayRow />);

      expect(trackMock).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        {
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.PAYMENT_TOKEN_SELECTOR_DISMISSED,
          [PERPS_EVENT_PROPERTY.CURRENT_TOKEN]: 'USDC',
        },
      );
    });

    it('does NOT emit dismissed when a different token is selected', () => {
      setPayToken({ address: '0xusdc', chainId: '0xa4b1', symbol: 'USDC' });
      const { getByTestId, rerender } = renderWithProvider(<PerpsPayRow />);

      fireEvent.press(getByTestId(ConfirmationRowComponentIDs.PAY_WITH));
      // A different token (different address) was chosen.
      setPayToken({ address: '0xweth', chainId: '0xa4b1', symbol: 'WETH' });
      rerender(<PerpsPayRow />);

      expect(trackMock).not.toHaveBeenCalledWith(...dismissedCall);
    });

    it('does NOT emit dismissed when the current token row is re-pressed (explicit selection, unchanged identity)', () => {
      setPayToken({ address: '0xusdc', chainId: '0xa4b1', symbol: 'USDC' });
      const { getByTestId, rerender } = renderWithProvider(<PerpsPayRow />);

      fireEvent.press(getByTestId(ConfirmationRowComponentIDs.PAY_WITH));
      // The user pressed the already-selected row (a no-op for token identity)
      // — the selector rows record this as an explicit selection.
      markPerpsPaymentTokenSelection();
      rerender(<PerpsPayRow />);

      expect(trackMock).not.toHaveBeenCalledWith(...dismissedCall);
    });

    it('does NOT emit dismissed when a different token that shares a symbol is selected', () => {
      setPayToken({ address: '0xusdc', chainId: '0xa4b1', symbol: 'USDC' });
      const { getByTestId, rerender } = renderWithProvider(<PerpsPayRow />);

      fireEvent.press(getByTestId(ConfirmationRowComponentIDs.PAY_WITH));
      // Same symbol, different address/chain → identity changed, real selection.
      setPayToken({ address: '0xusdc2', chainId: '0x1', symbol: 'USDC' });
      rerender(<PerpsPayRow />);

      expect(trackMock).not.toHaveBeenCalledWith(...dismissedCall);
    });

    it('emits dismissed at most once per selector open', () => {
      setPayToken({ address: '0xusdc', chainId: '0xa4b1', symbol: 'USDC' });
      const { getByTestId, rerender } = renderWithProvider(<PerpsPayRow />);

      fireEvent.press(getByTestId(ConfirmationRowComponentIDs.PAY_WITH));
      rerender(<PerpsPayRow />);
      rerender(<PerpsPayRow />);

      const dismissedCalls = trackMock.mock.calls.filter(
        ([, props]) =>
          props?.[PERPS_EVENT_PROPERTY.INTERACTION_TYPE] ===
          PERPS_EVENT_VALUE.INTERACTION_TYPE.PAYMENT_TOKEN_SELECTOR_DISMISSED,
      );
      expect(dismissedCalls).toHaveLength(1);
    });

    it('does NOT emit dismissed on a plain focus with no selector open', () => {
      setPayToken({ address: '0xusdc', chainId: '0xa4b1', symbol: 'USDC' });
      const { rerender } = renderWithProvider(<PerpsPayRow />);

      rerender(<PerpsPayRow />);

      expect(trackMock).not.toHaveBeenCalledWith(...dismissedCall);
    });
  });
});
