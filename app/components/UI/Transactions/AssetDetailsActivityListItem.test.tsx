import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import AssetDetailsActivityListItem from './AssetDetailsActivityListItem';
import Routes from '../../../constants/navigation/Routes';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import type { TransactionWithImportTime } from './AssetDetailsActivityListItem.utils';

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

jest.mock('../ActivityListItemRow/ActivityListItemRow', () => ({
  ActivityListItemRow: jest.fn(({ onPress, item }) => {
    const { TouchableOpacity } = jest.requireActual('react-native');
    return (
      <TouchableOpacity
        testID="activity-list-item-row"
        onPress={() => onPress?.(item)}
      />
    );
  }),
  resolveActivityListItemTitle: jest.fn(() => 'Send ETH'),
}));

const mockUseSelector = jest.mocked(useSelector);

const createNavigation = () =>
  ({
    navigate: jest.fn(),
  }) as unknown as AppNavigationProp & { navigate: jest.Mock };

const createTransaction = (
  overrides: Partial<TransactionWithImportTime> = {},
): TransactionWithImportTime => ({
  id: 'tx-1',
  chainId: '0x1',
  hash: '0xabc',
  networkClientId: 'mainnet',
  status: TransactionStatus.confirmed,
  time: 1000,
  type: TransactionType.simpleSend,
  txParams: {
    from: '0x123',
    to: '0x456',
    value: '0x1',
  },
  ...overrides,
});

describe('AssetDetailsActivityListItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccount) {
        return { metadata: { importTime: 2000 } };
      }
      return undefined;
    });
  });

  it('renders account import marker for transaction import insertion point', () => {
    const navigation = createNavigation();
    const transaction = createTransaction({ insertImportTime: true });

    const { getByTestId } = render(
      <AssetDetailsActivityListItem
        transaction={transaction}
        index={0}
        assetSymbol="ETH"
        chainId="0x1"
        navigation={navigation}
        onSpeedUpAction={jest.fn()}
        onCancelAction={jest.fn()}
      />,
    );

    const importRow = getByTestId('activity-list-account-import-time-row');
    fireEvent.press(importRow);

    expect(importRow).toBeTruthy();
    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.MODAL.ROOT_MODAL_FLOW,
      { screen: Routes.SHEET.IMPORT_WALLET_TIP },
    );
  });
});
