import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MONEY_ACTIVITY_TRANSACTIONS from '../../__fixtures__/moneyActivityTransactions';
import { getNetworkImageSource } from '../../../../../util/networks';
import {
  type MoneyTransactionDisplayInfo,
  useMoneyTransactionDisplayInfo,
} from '../../hooks/useMoneyTransactionDisplayInfo';
import MoneyActivityItem from './MoneyActivityItem';
import { MoneyActivityItemTestIds } from './MoneyActivityItem.testIds';

jest.mock('../../hooks/useMoneyTransactionDisplayInfo');
jest.mock('../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'network' })),
}));

const mockUseMoneyTransactionDisplayInfo = jest.mocked(
  useMoneyTransactionDisplayInfo,
);
const mockGetNetworkImageSource = jest.mocked(getNetworkImageSource);
const transaction = MONEY_ACTIVITY_TRANSACTIONS[6];
const pendingTransaction = MONEY_ACTIVITY_TRANSACTIONS[0];
const failedTransaction = MONEY_ACTIVITY_TRANSACTIONS[3];
const moneyAddress = '0x0000000000000000000000000000000000000001';

const mockDisplayInfo = (
  overrides: Partial<MoneyTransactionDisplayInfo> = {},
): MoneyTransactionDisplayInfo => ({
  label: 'Converted',
  description: 'USDC → mUSD',
  primaryAmount: '+1,000.00 mUSD',
  fiatAmount: '+$1,000.00',
  isIncoming: true,
  icon: IconName.SwapHorizontal,
  status: 'confirmed',
  ...overrides,
});

describe('MoneyActivityItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyTransactionDisplayInfo.mockReturnValue(mockDisplayInfo());
  });

  it('requests display information for the transaction and Money address', () => {
    renderWithProvider(
      <MoneyActivityItem tx={transaction} moneyAddress={moneyAddress} />,
    );

    expect(mockUseMoneyTransactionDisplayInfo).toHaveBeenCalledTimes(1);
    expect(mockUseMoneyTransactionDisplayInfo).toHaveBeenCalledWith(
      transaction,
      moneyAddress,
    );
  });

  it('renders the activity label and description', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyActivityItem tx={transaction} moneyAddress={moneyAddress} />,
    );

    expect(getByTestId(MoneyActivityItemTestIds.LABEL)).toHaveTextContent(
      'Converted',
    );
    expect(getByTestId(MoneyActivityItemTestIds.DESCRIPTION)).toHaveTextContent(
      'USDC → mUSD',
    );
  });

  it('renders the fiat amount', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyActivityItem tx={transaction} moneyAddress={moneyAddress} />,
    );

    expect(getByTestId(MoneyActivityItemTestIds.FIAT_AMOUNT)).toHaveTextContent(
      '+$1,000.00',
    );
  });

  it('renders the activity icon', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyActivityItem tx={transaction} moneyAddress={moneyAddress} />,
    );

    const icon = getByTestId(MoneyActivityItemTestIds.ICON);

    if ('iconName' in icon.props) {
      expect(icon).toHaveProp('iconName', IconName.SwapHorizontal);
    }
    expect(icon).toHaveProp('accessibilityLabel', IconName.SwapHorizontal);
    expect(mockUseMoneyTransactionDisplayInfo).toHaveReturnedWith(
      expect.objectContaining({ icon: IconName.SwapHorizontal }),
    );
  });

  it('omits the description when display information has no description', () => {
    mockUseMoneyTransactionDisplayInfo.mockReturnValue(
      mockDisplayInfo({ description: undefined }),
    );

    const { queryByTestId } = renderWithProvider(
      <MoneyActivityItem tx={transaction} moneyAddress={moneyAddress} />,
    );

    expect(
      queryByTestId(MoneyActivityItemTestIds.DESCRIPTION),
    ).not.toBeOnTheScreen();
  });

  it('passes the transaction to the row press callback', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <MoneyActivityItem
        tx={transaction}
        moneyAddress={moneyAddress}
        onPress={onPress}
      />,
    );

    fireEvent.press(
      getByTestId(`${MoneyActivityItemTestIds.ROW}-${transaction.id}`),
    );

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(transaction);
  });

  it('leaves the row non-pressable when no callback is provided', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyActivityItem tx={transaction} moneyAddress={moneyAddress} />,
    );

    expect(
      getByTestId(`${MoneyActivityItemTestIds.ROW}-${transaction.id}`).props
        .onPress,
    ).toBeUndefined();
  });

  it('preserves the transaction subtitle for failed activity', () => {
    mockUseMoneyTransactionDisplayInfo.mockReturnValue(
      mockDisplayInfo({
        label: 'Conversion failed',
        description: 'USDC → mUSD',
        fiatAmount: '+$0.00',
        status: 'failed',
      }),
    );

    const { getByTestId } = renderWithProvider(
      <MoneyActivityItem tx={failedTransaction} moneyAddress={moneyAddress} />,
    );

    expect(getByTestId(MoneyActivityItemTestIds.LABEL)).toHaveTextContent(
      'Conversion failed',
    );
    expect(getByTestId(MoneyActivityItemTestIds.DESCRIPTION)).toHaveTextContent(
      'USDC → mUSD',
    );
    expect(getByTestId(MoneyActivityItemTestIds.FIAT_AMOUNT)).toHaveTextContent(
      '+$0.00',
    );
  });

  it('renders a spinner for pending activity', () => {
    mockUseMoneyTransactionDisplayInfo.mockReturnValue(
      mockDisplayInfo({ status: 'pending' }),
    );

    const { getByTestId } = renderWithProvider(
      <MoneyActivityItem tx={pendingTransaction} moneyAddress={moneyAddress} />,
    );

    expect(
      getByTestId(MoneyActivityItemTestIds.PENDING_SPINNER, {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
  });

  it('omits the spinner for confirmed activity', () => {
    const { queryByTestId } = renderWithProvider(
      <MoneyActivityItem tx={transaction} moneyAddress={moneyAddress} />,
    );

    expect(
      queryByTestId(MoneyActivityItemTestIds.PENDING_SPINNER, {
        includeHiddenElements: true,
      }),
    ).not.toBeOnTheScreen();
  });

  it('resolves the network image when the network badge is visible', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyActivityItem
        tx={transaction}
        moneyAddress={moneyAddress}
        showNetworkBadge
      />,
    );

    expect(mockGetNetworkImageSource).toHaveBeenCalledTimes(1);
    expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
      chainId: transaction.chainId,
    });
    expect(
      getByTestId(MoneyActivityItemTestIds.NETWORK_BADGE),
    ).toBeOnTheScreen();
  });

  it('skips network image resolution when the network badge is hidden', () => {
    const { queryByTestId } = renderWithProvider(
      <MoneyActivityItem tx={transaction} moneyAddress={moneyAddress} />,
    );

    expect(mockGetNetworkImageSource).not.toHaveBeenCalled();
    expect(
      queryByTestId(MoneyActivityItemTestIds.NETWORK_BADGE),
    ).not.toBeOnTheScreen();
  });

  it('renders the fiat amount when privacy mode is disabled', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyActivityItem
        tx={transaction}
        moneyAddress={moneyAddress}
        privacyMode={false}
      />,
    );

    expect(getByTestId(MoneyActivityItemTestIds.FIAT_AMOUNT)).toHaveTextContent(
      '+$1,000.00',
    );
  });

  it('masks the fiat amount when privacy mode is enabled', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyActivityItem
        tx={transaction}
        moneyAddress={moneyAddress}
        privacyMode
      />,
    );

    expect(getByTestId(MoneyActivityItemTestIds.FIAT_AMOUNT)).toHaveTextContent(
      '•'.repeat(6),
    );
  });
});
