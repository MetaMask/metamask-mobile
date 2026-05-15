import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  type TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { IconName } from '@metamask/design-system-react-native';
import type { Hex } from '@metamask/utils';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useMoneyTransactionDisplayInfo } from '../../hooks/useMoneyTransactionDisplayInfo';
import MoneyActivityItem from './MoneyActivityItem';
import { MoneyActivityItemTestIds } from './MoneyActivityItem.testIds';

const MOCK_CHAIN: Hex = '0x1';

const baseTx = {
  id: 'tx-row-1',
  chainId: MOCK_CHAIN,
  type: TransactionType.incoming,
} as unknown as TransactionMeta;

jest.mock('../../hooks/useMoneyTransactionDisplayInfo');

jest.mock('../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'network' })),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { View } = jest.requireActual('react-native');
  return {
    ...actual,
    AvatarIcon: ({
      iconName,
      testID,
    }: {
      iconName: string;
      testID?: string;
    }) => <View testID={testID} accessibilityLabel={iconName} />,
  };
});

jest.mock(
  '../../../../../component-library/components/Badges/BadgeWrapper',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        children,
        badgeElement,
      }: {
        children: unknown;
        badgeElement?: unknown;
      }) => (
        <View testID="mock-badge-wrapper">
          {badgeElement}
          {children}
        </View>
      ),
    };
  },
);

jest.mock('../../../../../component-library/components/Badges/Badge', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="mock-network-badge" />,
    BadgeVariant: { Network: 'Network' },
  };
});

const mockUseMoneyTransactionDisplayInfo = jest.mocked(
  useMoneyTransactionDisplayInfo,
);

describe('MoneyActivityItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyTransactionDisplayInfo.mockReturnValue({
      label: 'Label',
      description: 'Description',
      primaryAmount: '+$0.00',
      fiatAmount: '$0.00',
      isIncoming: true,
      icon: IconName.Arrow2Down,
    });
  });

  it('renders display fields from useMoneyTransactionDisplayInfo', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <MoneyActivityItem tx={baseTx} moneyAddress="0x1" />,
    );

    expect(getByText('Label')).toBeOnTheScreen();
    expect(getByText('Description')).toBeOnTheScreen();
    expect(getByText('+$0.00')).toBeOnTheScreen();
    expect(getByText('$0.00')).toBeOnTheScreen();
    expect(
      getByTestId(`${MoneyActivityItemTestIds.ROW}-tx-row-1`),
    ).toBeOnTheScreen();
  });

  it('renders the avatar icon', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyActivityItem tx={baseTx} moneyAddress="0x1" />,
    );

    expect(getByTestId(MoneyActivityItemTestIds.ICON)).toBeOnTheScreen();
  });

  it('omits description when hook returns undefined description', () => {
    mockUseMoneyTransactionDisplayInfo.mockReturnValue({
      label: 'Label',
      description: undefined,
      primaryAmount: '+$0.00',
      fiatAmount: '$0.00',
      isIncoming: false,
      icon: IconName.Arrow2Down,
    });

    const { queryByText } = renderWithProvider(
      <MoneyActivityItem tx={baseTx} moneyAddress="0x1" />,
    );

    expect(queryByText('Description')).toBeNull();
  });

  it('invokes onPress with transaction id when the row is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <MoneyActivityItem tx={baseTx} moneyAddress="0x1" onPress={onPress} />,
    );

    fireEvent.press(getByTestId(`${MoneyActivityItemTestIds.ROW}-tx-row-1`));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('tx-row-1');
  });

  it('shows "Failed" in the description slot for a failed transaction', () => {
    const failedTx = {
      ...baseTx,
      status: TransactionStatus.failed,
    } as unknown as TransactionMeta;

    const { getByText, queryByText } = renderWithProvider(
      <MoneyActivityItem tx={failedTx} moneyAddress="0x1" />,
    );

    expect(getByText('Failed')).toBeOnTheScreen();
    // Normal description should not appear for failed rows
    expect(queryByText('Description')).toBeNull();
  });

  it('renders network badge subtree when showNetworkBadge is true', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyActivityItem tx={baseTx} moneyAddress="0x1" showNetworkBadge />,
    );

    expect(getByTestId('mock-badge-wrapper')).toBeOnTheScreen();
    expect(getByTestId('mock-network-badge')).toBeOnTheScreen();
    expect(getByTestId(MoneyActivityItemTestIds.ICON)).toBeOnTheScreen();
  });

  it('renders the AvatarIcon and no longer renders the token avatar', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <MoneyActivityItem tx={baseTx} moneyAddress="0x1" />,
    );

    expect(getByTestId(MoneyActivityItemTestIds.ICON)).toBeOnTheScreen();
    expect(queryByTestId('mock-avatar-token')).toBeNull();
  });

  it('forwards the icon name from useMoneyTransactionDisplayInfo', () => {
    mockUseMoneyTransactionDisplayInfo.mockReturnValue({
      label: 'Label',
      description: 'Description',
      primaryAmount: '+$0.00',
      fiatAmount: '$0.00',
      isIncoming: true,
      icon: IconName.SwapHorizontal,
    });

    const { getByTestId } = renderWithProvider(
      <MoneyActivityItem tx={baseTx} moneyAddress="0x1" />,
    );

    expect(getByTestId(MoneyActivityItemTestIds.ICON)).toHaveProp(
      'accessibilityLabel',
      IconName.SwapHorizontal,
    );
  });
});
