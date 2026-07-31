import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  SolScope,
  type Transaction,
  TransactionStatus,
  TransactionType,
} from '@metamask/keyring-api';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import MultichainAssetDetailsActivityListItem from './MultichainAssetDetailsActivityListItem';
import Routes from '../../../constants/navigation/Routes';
import { selectIsTransactionsRedesignEnabled } from '../../../selectors/featureFlagController/activityRedesign';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: { alternative: 'text-alternative' },
    },
  }),
}));

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(() => ({})),
    })),
  }),
}));

jest.mock('../../hooks/useMultichainTransactionDisplay', () => ({
  useMultichainTransactionDisplay: jest.fn(() => ({
    title: 'Send SOL',
    to: { amount: '1', unit: 'SOL' },
    isRedeposit: false,
  })),
}));

jest.mock('../../UI/ActivityListItemRow/ActivityListItemRow', () => ({
  ActivityListItemRow: jest.fn(({ onPress, item }) => {
    const { TouchableOpacity } = jest.requireActual('react-native');
    return (
      <TouchableOpacity
        testID="activity-list-item-row"
        onPress={() => onPress?.(item)}
      />
    );
  }),
}));

const createNavigation = () =>
  ({
    navigate: jest.fn(),
  }) as unknown as AppNavigationProp & { navigate: jest.Mock };

type TransactionWithImportTime = Transaction & {
  insertImportTime?: boolean;
};

const createTransaction = (
  overrides: Partial<TransactionWithImportTime> = {},
): TransactionWithImportTime => ({
  id: 'tx-1',
  chain: SolScope.Mainnet,
  account: 'from',
  events: [],
  fees: [],
  status: TransactionStatus.Confirmed,
  timestamp: 1,
  type: TransactionType.Send,
  from: [
    {
      address: 'from',
      asset: {
        fungible: true,
        amount: '1',
        unit: 'SOL',
        type: `${SolScope.Mainnet}/slip44:501`,
      },
    },
  ],
  to: [{ address: 'to', asset: null }],
  ...overrides,
});

const mockUseSelector = jest.mocked(useSelector);

describe('MultichainAssetDetailsActivityListItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Redesign disabled by default -> legacy bottom sheet.
    mockUseSelector.mockImplementation(() => false);
  });

  it('routes to the ActivityDetails screen when the redesign is enabled', () => {
    mockUseSelector.mockImplementation(
      (selector) => selector === selectIsTransactionsRedesignEnabled,
    );
    const navigation = createNavigation();
    const transaction = createTransaction();

    const { getByTestId } = render(
      <MultichainAssetDetailsActivityListItem
        transaction={transaction}
        index={0}
        chainId={SolScope.Mainnet}
        navigation={navigation}
      />,
    );

    fireEvent.press(getByTestId('activity-list-item-row'));

    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.ACTIVITY_DETAILS,
      expect.objectContaining({
        chainId: SolScope.Mainnet,
        txIdentifier: 'tx-1',
      }),
    );
  });

  it('does not override the row title, so it uses the shared redesign copy', () => {
    const { ActivityListItemRow } = jest.requireMock(
      '../../UI/ActivityListItemRow/ActivityListItemRow',
    );
    const navigation = createNavigation();
    const transaction = createTransaction();

    render(
      <MultichainAssetDetailsActivityListItem
        transaction={transaction}
        index={0}
        chainId={SolScope.Mainnet}
        navigation={navigation}
      />,
    );

    expect(ActivityListItemRow.mock.calls[0][0]).not.toHaveProperty('title');
  });

  it('opens multichain details when transaction has import insertion point', () => {
    const navigation = createNavigation();
    const transaction = createTransaction({ insertImportTime: true });

    const { getByTestId, queryByTestId } = render(
      <MultichainAssetDetailsActivityListItem
        transaction={transaction}
        index={0}
        chainId={SolScope.Mainnet}
        navigation={navigation}
      />,
    );

    fireEvent.press(getByTestId('activity-list-item-row'));

    expect(
      queryByTestId('activity-list-account-import-time-row'),
    ).not.toBeOnTheScreen();
    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.MODAL.ROOT_MODAL_FLOW,
      expect.objectContaining({
        screen: Routes.SHEET.MULTICHAIN_TRANSACTION_DETAILS,
      }),
    );
  });
});
