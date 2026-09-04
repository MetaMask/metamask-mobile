import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import AssetDetailsActivityListItem from './AssetDetailsActivityListItem';
import Routes from '../../../constants/navigation/Routes';
import type { TransactionWithImportTime } from './AssetDetailsActivityListItem.utils';
import { resolveActivityListItemTitle } from '../ActivityListItemRow/ActivityListItemRow';
import { handleUnifiedSwapsTxHistoryItemClick } from '../Bridge/utils/transaction-history';

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

jest.mock('../Bridge/utils/transaction-history', () => ({
  handleUnifiedSwapsTxHistoryItemClick: jest.fn(),
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
        accountImportTime={2000}
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

  it('does not render account import marker when import time is null', () => {
    const navigation = createNavigation();
    const transaction = createTransaction({ insertImportTime: true });

    const { queryByTestId } = render(
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

    expect(
      queryByTestId('activity-list-account-import-time-row'),
    ).not.toBeOnTheScreen();
  });

  it('routes a bridge to the redesigned ActivityDetails screen, not the legacy sheet', () => {
    const navigation = createNavigation();
    const transaction = createTransaction({
      id: 'bridge-1',
      type: TransactionType.bridge,
    });
    const bridgeHistory = {
      'bridge-1': {
        quote: {
          srcChainId: 8453,
          destChainId: 1151111081099710,
          srcAsset: { chainId: 8453, symbol: 'USDC' },
          destAsset: { chainId: 1151111081099710, symbol: 'SOL' },
        },
      },
    };

    const { getByTestId } = render(
      <AssetDetailsActivityListItem
        transaction={transaction}
        index={0}
        assetSymbol="USDC"
        chainId="0x2105"
        bridgeHistory={bridgeHistory as never}
        navigation={navigation}
        onSpeedUpAction={jest.fn()}
        onCancelAction={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('activity-list-item-row'));

    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.ACTIVITY_DETAILS,
      expect.objectContaining({ txIdentifier: 'bridge-1' }),
    );
    // Neither the legacy details sheet nor the legacy bridge-status screen.
    expect(handleUnifiedSwapsTxHistoryItemClick).not.toHaveBeenCalled();
  });

  it('routes to the ActivityDetails screen when the redesign is enabled', () => {
    const navigation = createNavigation();
    const transaction = createTransaction();

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

    fireEvent.press(getByTestId('activity-list-item-row'));

    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.ACTIVITY_DETAILS,
      expect.objectContaining({
        chainId: 'eip155:1',
        txIdentifier: 'tx-1',
        preloadKey: expect.any(String),
      }),
    );
  });

  it('renders successfully when token metadata is resolved from the selected account group EVM account', () => {
    const navigation = createNavigation();
    expect(() =>
      render(
        <AssetDetailsActivityListItem
          transaction={createTransaction()}
          index={0}
          assetSymbol="ETH"
          chainId="0x1"
          groupEvmAccountAddress="0x123"
          networkConfigurations={{ '0x1': { nativeCurrency: 'ETH' } }}
          allTokens={{
            '0x1': {
              '0x123': [
                {
                  address: '0x456',
                  symbol: 'USDC',
                  decimals: 6,
                },
              ],
            },
          }}
          navigation={navigation}
          onSpeedUpAction={jest.fn()}
          onCancelAction={jest.fn()}
        />,
      ),
    ).not.toThrow();
  });
});
