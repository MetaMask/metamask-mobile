import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { PerpsPayRow } from './PerpsPayRow';
import { useNavigation } from '@react-navigation/native';
import { useTransactionPayToken } from '../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { useTransactionMetadataRequest } from '../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import {
  useIsPerpsBalanceSelected,
  usePerpsPayWithToken,
} from '../../hooks/useIsPerpsBalanceSelected';
import { useTokenWithBalance } from '../../../../Views/confirmations/hooks/tokens/useTokenWithBalance';
import { useConfirmationMetricEvents } from '../../../../Views/confirmations/hooks/metrics/useConfirmationMetricEvents';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { isHardwareAccount } from '../../../../../util/address';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { usePerpsSelector } from '../../hooks/usePerpsSelector';
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
jest.mock('../../hooks/useIsPerpsBalanceSelected', () => ({
  useIsPerpsBalanceSelected: jest.fn(),
  usePerpsPayWithToken: jest.fn(),
}));
jest.mock('../../hooks/usePerpsSelector');
jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      setSelectedPaymentToken: jest.fn(),
    },
  },
}));
jest.mock('../../../../Views/confirmations/hooks/tokens/useTokenWithBalance');
jest.mock(
  '../../../../Views/confirmations/hooks/metrics/useConfirmationMetricEvents',
);
jest.mock('../../hooks/usePerpsEventTracking');
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
const mockUsePerpsPayWithToken = usePerpsPayWithToken as jest.MockedFunction<
  typeof usePerpsPayWithToken
>;
const mockUsePerpsSelector = usePerpsSelector as jest.MockedFunction<
  typeof usePerpsSelector
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
    mockUsePerpsSelector.mockReturnValue({});
    mockUsePerpsPayWithToken.mockReturnValue(null);
  });

  it('renders pay with label', () => {
    const { getByText } = renderWithProvider(
      <PerpsPayRow initialAsset="BTC" />,
    );

    expect(getByText('confirm.label.pay_with')).toBeOnTheScreen();
  });

  it('renders perps balance label when perps balance is selected', () => {
    mockUseIsPerpsBalanceSelected.mockReturnValue(true);

    const { getByTestId } = renderWithProvider(
      <PerpsPayRow initialAsset="BTC" />,
    );

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

    const { getByTestId } = renderWithProvider(
      <PerpsPayRow initialAsset="BTC" />,
    );

    expect(
      getByTestId(TransactionPayComponentIDs.PAY_WITH_SYMBOL),
    ).toHaveTextContent('USDC');
  });

  it('navigates to pay with modal when row is pressed and not hardware account', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsPayRow initialAsset="BTC" />,
    );

    fireEvent.press(getByTestId(ConfirmationRowComponentIDs.PAY_WITH));

    expect(navigateMock).toHaveBeenCalledWith(
      Routes.CONFIRMATION_PAY_WITH_MODAL,
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

    const { getByTestId } = renderWithProvider(
      <PerpsPayRow initialAsset="BTC" />,
    );

    fireEvent.press(getByTestId(ConfirmationRowComponentIDs.PAY_WITH));

    expect(navigateMock).not.toHaveBeenCalled();
    expect(setConfirmationMetricMock).not.toHaveBeenCalled();
  });

  it('calls onPayWithInfoPress when info icon is pressed', () => {
    const onPayWithInfoPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <PerpsPayRow
        initialAsset="BTC"
        onPayWithInfoPress={onPayWithInfoPress}
      />,
    );

    fireEvent.press(getByTestId('perps-pay-row-info'));

    expect(onPayWithInfoPress).toHaveBeenCalledTimes(1);
  });

  it('renders with embedded style when embeddedInStack is true', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsPayRow initialAsset="BTC" embeddedInStack />,
    );

    expect(getByTestId(ConfirmationRowComponentIDs.PAY_WITH)).toBeOnTheScreen();
  });

  it('syncs pay token from pending config when it differs from current', () => {
    const setPayTokenMock = jest.fn();
    const pendingToken = {
      address: '0xPending',
      chainId: '0x1',
      description: 'Pending USDC',
    };
    mockUsePerpsSelector.mockReturnValue({
      selectedPaymentToken: pendingToken,
    });
    mockUsePerpsPayWithToken.mockReturnValue({
      address: pendingToken.address,
      chainId: pendingToken.chainId,
      description: pendingToken.description,
    });
    mockUseTransactionPayToken.mockReturnValue({
      payToken: { address: '0xOther', chainId: '0xa4b1', symbol: 'USDC' },
      setPayToken: setPayTokenMock,
    } as unknown as ReturnType<typeof useTransactionPayToken>);

    renderWithProvider(<PerpsPayRow initialAsset="BTC" />);

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: '0xPending',
      chainId: '0x1',
    });
    expect(
      Engine.context.PerpsController?.setSelectedPaymentToken,
    ).toHaveBeenCalledWith({
      description: 'Pending USDC',
      address: '0xPending',
      chainId: '0x1',
    });
  });

  it('does not call setPayToken when pay token already matches pending config', () => {
    const setPayTokenMock = jest.fn();
    const pendingToken = {
      address: '0xSame',
      chainId: '0x1',
      description: 'Same USDC',
    };
    mockUsePerpsSelector.mockReturnValue({
      selectedPaymentToken: pendingToken,
    });
    mockUsePerpsPayWithToken.mockReturnValue({
      address: pendingToken.address,
      chainId: pendingToken.chainId,
      description: pendingToken.description,
    });
    mockUseTransactionPayToken.mockReturnValue({
      payToken: {
        address: pendingToken.address,
        chainId: pendingToken.chainId,
        symbol: 'USDC',
      },
      setPayToken: setPayTokenMock,
    } as unknown as ReturnType<typeof useTransactionPayToken>);

    renderWithProvider(<PerpsPayRow initialAsset="BTC" />);

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });

  it('calls setSelectedPaymentToken(null) when pending config has no selected token', () => {
    mockUsePerpsSelector.mockReturnValue({});
    mockUsePerpsPayWithToken.mockReturnValue(null);

    renderWithProvider(<PerpsPayRow initialAsset="BTC" />);

    expect(
      Engine.context.PerpsController?.setSelectedPaymentToken,
    ).toHaveBeenCalledWith(null);
  });
});
