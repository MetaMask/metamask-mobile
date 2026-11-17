import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { TransactionType } from '@metamask/transaction-controller';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import useMoneyVaultApy from '../../../../../UI/Money/hooks/useMoneyVaultApy';
import {
  MONEY_TOOLTIP_NAMES,
  MONEY_TOOLTIP_TYPES,
  SCREEN_NAMES,
} from '../../../../../UI/Money/constants/moneyEvents';
import { useMoneyAnalytics } from '../../../../../UI/Money/hooks/useMoneyAnalytics';
import {
  MoneyDepositToRow,
  MoneyDepositToRowIDs,
} from './money-deposit-to-row';

const mockNavigate = jest.fn();
const mockTrackTooltipClicked = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../../../../UI/Money/hooks/useMoneyVaultApy');
jest.mock('../../../../../UI/Money/hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(() => ({
    trackTooltipClicked: mockTrackTooltipClicked,
  })),
}));

const useTransactionMetadataRequestMock = jest.mocked(
  useTransactionMetadataRequest,
);
const useMoneyVaultApyMock = jest.mocked(useMoneyVaultApy);

function mockApy(apyPercent: number | undefined) {
  useMoneyVaultApyMock.mockReturnValue({
    apyDecimal: apyPercent !== undefined ? apyPercent / 100 : undefined,
    apyPercent,
    vaultApyQuery: { isLoading: false },
  } as unknown as ReturnType<typeof useMoneyVaultApy>);
}

describe('MoneyDepositToRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountDeposit,
    } as ReturnType<typeof useTransactionMetadataRequest>);
    mockApy(6.2);
  });

  it('returns null for non-moneyAccountDeposit transactions', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDeposit,
    } as ReturnType<typeof useTransactionMetadataRequest>);

    const { queryByTestId } = renderWithProvider(<MoneyDepositToRow />);

    expect(queryByTestId(MoneyDepositToRowIDs.ROW)).toBeNull();
  });

  it('renders To row with rounded-square MoneyBalanceIcon, MetaMask Money, bullet separator, and live APY', () => {
    const { getByTestId, getByText, UNSAFE_getByProps } = renderWithProvider(
      <MoneyDepositToRow />,
    );

    expect(getByTestId(MoneyDepositToRowIDs.ROW)).toBeOnTheScreen();
    expect(
      UNSAFE_getByProps({ name: 'money-balance', width: 24, height: 24 }),
    ).toBeOnTheScreen();
    expect(getByText(strings('confirm.label.to'))).toBeOnTheScreen();
    expect(getByText('MetaMask Money')).toBeOnTheScreen();
    expect(getByText(' • ', { exact: true })).toBeOnTheScreen();
    expect(getByText('6.2% APY')).toBeOnTheScreen();
    expect(useMoneyAnalytics).toHaveBeenCalledWith({
      screen_name: SCREEN_NAMES.MONEY_DEPOSIT,
    });
  });

  it('renders nested moneyAccountDeposit transactions', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.batch,
      nestedTransactions: [{ type: TransactionType.moneyAccountDeposit }],
    } as ReturnType<typeof useTransactionMetadataRequest>);

    const { getByTestId } = renderWithProvider(<MoneyDepositToRow />);

    expect(getByTestId(MoneyDepositToRowIDs.ROW)).toBeOnTheScreen();
  });

  it('omits the bullet and APY run when APY is unavailable', () => {
    mockApy(undefined);

    const { getByText, queryByTestId, queryByText } = renderWithProvider(
      <MoneyDepositToRow />,
    );

    expect(getByText('MetaMask Money')).toBeOnTheScreen();
    expect(queryByText(' • ', { exact: true })).toBeNull();
    expect(queryByTestId(MoneyDepositToRowIDs.APY_PRESSABLE)).toBeNull();
  });

  it('opens the Money splash in infoMode when MetaMask Money is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyDepositToRow />);

    fireEvent.press(getByTestId(MoneyDepositToRowIDs.MONEY_PRESSABLE));

    expect(mockTrackTooltipClicked).toHaveBeenCalledWith({
      tooltip_name: MONEY_TOOLTIP_NAMES.METAMASK_MONEY,
      tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
    });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.SPLASH, {
      infoMode: true,
    });
  });

  it('opens MoneyApyInfoSheet with live APY when the APY run is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyDepositToRow />);

    fireEvent.press(getByTestId(MoneyDepositToRowIDs.APY_PRESSABLE));

    expect(mockTrackTooltipClicked).toHaveBeenCalledWith({
      tooltip_name: MONEY_TOOLTIP_NAMES.APY,
      tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
    });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.APY_INFO_SHEET,
      params: { apy: 6.2, variant: 'deposit' },
    });
  });
});
