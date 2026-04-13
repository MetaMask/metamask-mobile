import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useMoneyTransactionDisplayInfo } from '../../hooks/useMoneyTransactionDisplayInfo';
import { MUSD_TOKEN_ADDRESS } from '../../../Earn/constants/musd';
import MoneyActivityItem from './MoneyActivityItem';
import { MoneyActivityItemTestIds } from './MoneyActivityItem.testIds';

const MOCK_CHAIN: Hex = '0x1';

const baseTx = {
  id: 'tx-row-1',
  chainId: MOCK_CHAIN,
  type: TransactionType.incoming,
  transferInformation: {
    amount: '1000000000',
    symbol: 'mUSD',
    decimals: 6,
    contractAddress: MUSD_TOKEN_ADDRESS,
  },
} as unknown as TransactionMeta;

jest.mock('../../hooks/useMoneyTransactionDisplayInfo');

jest.mock('../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'network' })),
}));

jest.mock(
  '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken',
  () => {
    const { View } = jest.requireActual('react-native');
    return () => <View testID="mock-avatar-token" />;
  },
);

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

  it('omits description when hook returns undefined description', () => {
    mockUseMoneyTransactionDisplayInfo.mockReturnValue({
      label: 'Label',
      description: undefined,
      primaryAmount: '+$0.00',
      fiatAmount: '$0.00',
      isIncoming: false,
    });

    const { queryByText } = renderWithProvider(
      <MoneyActivityItem tx={baseTx} moneyAddress="0x1" />,
    );

    expect(queryByText('Description')).toBeNull();
  });

  it('invokes onPress when the row is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <MoneyActivityItem tx={baseTx} moneyAddress="0x1" onPress={onPress} />,
    );

    fireEvent.press(getByTestId(`${MoneyActivityItemTestIds.ROW}-tx-row-1`));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders network badge subtree when showNetworkBadge is true', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyActivityItem tx={baseTx} moneyAddress="0x1" showNetworkBadge />,
    );

    expect(getByTestId('mock-badge-wrapper')).toBeOnTheScreen();
    expect(getByTestId('mock-network-badge')).toBeOnTheScreen();
  });
});
