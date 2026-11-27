import React from 'react';
import { Text as MockText } from 'react-native';
import { type PaymentMethod } from '@metamask/ramps-controller';
import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import { strings } from '../../../../../../../locales/i18n';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { selectPerpsLighterProviderEnabledFlag } from '../../../../../UI/Perps/selectors/featureFlags';
import { isLighterProviderEnabled } from '../../../../../UI/Perps/utils/lighterFeatureFlags';
import { POLYGON_PUSD } from '../../../constants/predict';
import { useIsMoneyAccountFlagDefault } from '../../../hooks/pay/useIsMoneyAccountFlagDefault';
import { useIsMoneyAccountPaymentOverride } from '../../../hooks/pay/useIsMoneyAccountPaymentOverride';
import { useTransactionPaySelectedFiatPaymentMethod } from '../../../hooks/pay/useTransactionPaySelectedFiatPaymentMethod';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { PayWithOption } from '../../confirm/confirm-component';
import { TokenIconProps } from '../../token-icon';
import { DepositToRow, DepositToRowIDs } from './deposit-to-row';

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: jest.fn(),
}));
jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../../hooks/pay/useIsMoneyAccountFlagDefault');
jest.mock('../../../hooks/pay/useIsMoneyAccountPaymentOverride');
jest.mock('../../../hooks/pay/useTransactionPaySelectedFiatPaymentMethod');
jest.mock('../../../hooks/pay/useTransactionPayToken');
jest.mock('../../../../../UI/Perps/selectors/featureFlags', () => ({
  selectPerpsLighterProviderEnabledFlag: jest.fn(),
}));
jest.mock('../../../../../UI/Perps/utils/lighterFeatureFlags', () => ({
  isLighterProviderEnabled: jest.fn(),
}));
jest.mock('../../token-icon', () => ({
  TokenIcon: (props: TokenIconProps) => (
    <MockText testID="deposit-to-token-icon">
      {`${props.address}:${props.chainId}:${props.symbol ?? ''}`}
    </MockText>
  ),
  TokenIconVariant: { Default: 'default', Row: 'row', Hero: 'hero' },
}));

const useParamsMock = jest.mocked(useParams);
const useTransactionMetadataRequestMock = jest.mocked(
  useTransactionMetadataRequest,
);
const useIsMoneyAccountFlagDefaultMock = jest.mocked(
  useIsMoneyAccountFlagDefault,
);
const useIsMoneyAccountPaymentOverrideMock = jest.mocked(
  useIsMoneyAccountPaymentOverride,
);
const useTransactionPaySelectedFiatPaymentMethodMock = jest.mocked(
  useTransactionPaySelectedFiatPaymentMethod,
);
const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
const selectPerpsLighterProviderEnabledFlagMock = jest.mocked(
  selectPerpsLighterProviderEnabledFlag,
);
const isLighterProviderEnabledMock = jest.mocked(isLighterProviderEnabled);

function renderRow(props?: { isResultReady?: boolean }) {
  return renderWithProvider(<DepositToRow {...props} />, {
    state: { engine: { backgroundState } },
  });
}

describe('DepositToRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useParamsMock.mockReturnValue({});
    useIsMoneyAccountFlagDefaultMock.mockReturnValue(false);
    useIsMoneyAccountPaymentOverrideMock.mockReturnValue(false);
    useTransactionPaySelectedFiatPaymentMethodMock.mockReturnValue(undefined);
    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
    } as ReturnType<typeof useTransactionPayToken>);
    selectPerpsLighterProviderEnabledFlagMock.mockReturnValue(false);
    isLighterProviderEnabledMock.mockReturnValue(false);
  });

  it('renders "To" -> "Perps balance" with the perps balance icon for perpsDeposit', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDeposit,
    } as ReturnType<typeof useTransactionMetadataRequest>);

    const { getByTestId, getByText } = renderRow();

    expect(getByTestId(DepositToRowIDs.ROW)).toBeOnTheScreen();
    expect(getByText(strings('confirm.label.to'))).toBeOnTheScreen();
    expect(getByTestId(DepositToRowIDs.PERPS_ICON)).toBeOnTheScreen();
    expect(getByTestId(DepositToRowIDs.VALUE)).toHaveTextContent(
      strings('confirm.pay_with_bottom_sheet.perps_balance'),
    );
  });

  it('renders "To" -> "Predict balance" with the Polygon pUSD TokenIcon for predictDeposit', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.predictDeposit,
    } as ReturnType<typeof useTransactionMetadataRequest>);

    const { getByTestId, getByText } = renderRow();

    expect(getByTestId(DepositToRowIDs.ROW)).toBeOnTheScreen();
    expect(getByText(strings('confirm.label.to'))).toBeOnTheScreen();
    expect(getByTestId('deposit-to-token-icon')).toHaveTextContent(
      `${POLYGON_PUSD.address}:${CHAIN_IDS.POLYGON}:${POLYGON_PUSD.symbol}`,
    );
    expect(getByTestId(DepositToRowIDs.VALUE)).toHaveTextContent(
      strings('confirm.pay_with_bottom_sheet.predict_balance'),
    );
  });

  it.each([
    TransactionType.moneyAccountDeposit,
    TransactionType.perpsDepositAndOrder,
    TransactionType.predictDepositAndOrder,
    TransactionType.perpsWithdraw,
    TransactionType.predictWithdraw,
    TransactionType.contractInteraction,
  ])('returns null for %s', (type) => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type,
    } as ReturnType<typeof useTransactionMetadataRequest>);

    const { queryByTestId } = renderRow();

    expect(queryByTestId(DepositToRowIDs.ROW)).toBeNull();
  });

  it.each([TransactionType.perpsDeposit, TransactionType.predictDeposit])(
    'returns null for %s when payWithOption is MoneyAccount',
    (type) => {
      useParamsMock.mockReturnValue({
        payWithOption: PayWithOption.MoneyAccount,
      });
      useTransactionMetadataRequestMock.mockReturnValue({
        type,
      } as ReturnType<typeof useTransactionMetadataRequest>);

      const { queryByTestId } = renderRow();

      expect(queryByTestId(DepositToRowIDs.ROW)).toBeNull();
    },
  );

  it.each([TransactionType.perpsDeposit, TransactionType.predictDeposit])(
    'returns null for %s when MoneyAccount payment override is active',
    (type) => {
      useIsMoneyAccountPaymentOverrideMock.mockReturnValue(true);
      useTransactionMetadataRequestMock.mockReturnValue({
        type,
      } as ReturnType<typeof useTransactionMetadataRequest>);

      const { queryByTestId } = renderRow();

      expect(queryByTestId(DepositToRowIDs.ROW)).toBeNull();
    },
  );

  it.each([TransactionType.perpsDeposit, TransactionType.predictDeposit])(
    'returns null for %s when MoneyAccount flag default is active before a token or result loads',
    (type) => {
      useIsMoneyAccountFlagDefaultMock.mockReturnValue(true);
      useTransactionMetadataRequestMock.mockReturnValue({
        type,
      } as ReturnType<typeof useTransactionMetadataRequest>);

      const { queryByTestId } = renderRow();

      expect(queryByTestId(DepositToRowIDs.ROW)).toBeNull();
    },
  );

  it('renders when MoneyAccount flag default is active once payToken is selected', () => {
    useIsMoneyAccountFlagDefaultMock.mockReturnValue(true);
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDeposit,
    } as ReturnType<typeof useTransactionMetadataRequest>);
    useTransactionPayTokenMock.mockReturnValue({
      payToken: { symbol: 'USDC' },
    } as ReturnType<typeof useTransactionPayToken>);

    const { getByTestId } = renderRow();

    expect(getByTestId(DepositToRowIDs.ROW)).toBeOnTheScreen();
  });

  it('renders when MoneyAccount flag default is active once isResultReady is true', () => {
    useIsMoneyAccountFlagDefaultMock.mockReturnValue(true);
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDeposit,
    } as ReturnType<typeof useTransactionMetadataRequest>);

    const { getByTestId } = renderRow({ isResultReady: true });

    expect(getByTestId(DepositToRowIDs.ROW)).toBeOnTheScreen();
  });

  it('returns null when a fiat payment method is selected', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDeposit,
    } as ReturnType<typeof useTransactionMetadataRequest>);
    useTransactionPaySelectedFiatPaymentMethodMock.mockReturnValue({
      id: 'pm-card',
    } as PaymentMethod);

    const { queryByTestId } = renderRow();

    expect(queryByTestId(DepositToRowIDs.ROW)).toBeNull();
  });

  it('returns null on perpsDeposit when PerpsReceiveToRow is visible', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDeposit,
    } as ReturnType<typeof useTransactionMetadataRequest>);
    selectPerpsLighterProviderEnabledFlagMock.mockReturnValue(true);
    isLighterProviderEnabledMock.mockReturnValue(true);

    const { queryByTestId } = renderRow();

    expect(queryByTestId(DepositToRowIDs.ROW)).toBeNull();
  });
});
