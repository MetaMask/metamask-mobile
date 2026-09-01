import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  SolScope,
  type Transaction,
  TransactionStatus,
  TransactionType,
} from '@metamask/keyring-api';
import { mapKeyringTransaction } from '@metamask/client-utils';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import type { ActivityListItem } from '../../../util/activity-adapters';
import MultichainAssetDetailsActivityListItem from './MultichainAssetDetailsActivityListItem';
import Routes from '../../../constants/navigation/Routes';
import { handleUnifiedSwapsTxHistoryItemClick } from '../../UI/Bridge/utils/transaction-history';
import { useMultichainTransactionDisplay } from '../../hooks/useMultichainTransactionDisplay';

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

jest.mock('../../UI/Bridge/utils/transaction-history', () => ({
  isBridgeTxHistoryItemBridge: jest.fn(
    (item: { quote: { srcChainId: unknown; destChainId: unknown } }) =>
      item.quote.srcChainId !== item.quote.destChainId,
  ),
  handleUnifiedSwapsTxHistoryItemClick: jest.fn(),
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

const mapTransactionToItem = (
  transaction: TransactionWithImportTime,
): ActivityListItem =>
  mapKeyringTransaction({ transaction }) as ActivityListItem;

describe('MultichainAssetDetailsActivityListItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the source transaction attached to the activity item', () => {
    const transaction = createTransaction();

    render(
      <MultichainAssetDetailsActivityListItem
        item={mapTransactionToItem(transaction)}
        transaction={transaction}
        index={0}
        chainId={SolScope.Mainnet}
        navigation={createNavigation()}
      />,
    );

    expect(useMultichainTransactionDisplay).toHaveBeenCalledWith(
      transaction,
      SolScope.Mainnet,
    );
  });

  it('routes to the ActivityDetails screen', () => {
    const navigation = createNavigation();
    const transaction = createTransaction();

    const { getByTestId } = render(
      <MultichainAssetDetailsActivityListItem
        item={mapTransactionToItem(transaction)}
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
        item={mapTransactionToItem(transaction)}
        transaction={transaction}
        index={0}
        chainId={SolScope.Mainnet}
        navigation={navigation}
      />,
    );

    expect(ActivityListItemRow.mock.calls[0][0]).not.toHaveProperty('title');
  });

  it('routes import-time rows to ActivityDetails', () => {
    const navigation = createNavigation();
    const transaction = createTransaction({ insertImportTime: true });

    const { getByTestId, queryByTestId } = render(
      <MultichainAssetDetailsActivityListItem
        item={mapTransactionToItem(transaction)}
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
      Routes.ACTIVITY_DETAILS,
      expect.objectContaining({
        chainId: SolScope.Mainnet,
        txIdentifier: 'tx-1',
      }),
    );
  });

  describe('rows carrying a bridge-history entry', () => {
    const createBridgeHistoryItem = (srcChainId: string, destChainId: string) =>
      ({
        status: { status: 'COMPLETE', srcChain: { txHash: 'tx-1' } },
        quote: {
          srcChainId,
          destChainId,
          srcTokenAmount: '1000000000',
          destTokenAmount: '1000000',
          srcAsset: {
            chainId: srcChainId,
            assetId: `${srcChainId}/slip44:501`,
            decimals: 9,
            symbol: 'SOL',
          },
          destAsset: {
            chainId: destChainId,
            assetId: `${destChainId}/slip44:60`,
            decimals: 6,
            symbol: 'USDC',
          },
        },
      }) as never;

    it('routes a same-chain swap to the redesigned ActivityDetails screen', () => {
      const navigation = createNavigation();
      const transaction = createTransaction({ type: TransactionType.Swap });

      const { getByTestId } = render(
        <MultichainAssetDetailsActivityListItem
          item={mapTransactionToItem(transaction)}
          transaction={transaction}
          bridgeHistoryItem={createBridgeHistoryItem(
            SolScope.Mainnet,
            SolScope.Mainnet,
          )}
          index={0}
          chainId={SolScope.Mainnet}
          navigation={navigation}
        />,
      );

      fireEvent.press(getByTestId('activity-list-item-row'));

      expect(handleUnifiedSwapsTxHistoryItemClick).not.toHaveBeenCalled();
      expect(navigation.navigate).toHaveBeenCalledWith(
        Routes.ACTIVITY_DETAILS,
        expect.objectContaining({ txIdentifier: 'tx-1' }),
      );
    });

    it('routes a cross-chain bridge to the redesigned ActivityDetails screen', () => {
      const navigation = createNavigation();
      const transaction = createTransaction({ type: TransactionType.Swap });

      const { getByTestId } = render(
        <MultichainAssetDetailsActivityListItem
          item={mapTransactionToItem(transaction)}
          transaction={transaction}
          bridgeHistoryItem={createBridgeHistoryItem(
            SolScope.Mainnet,
            'eip155:1',
          )}
          index={0}
          chainId={SolScope.Mainnet}
          navigation={navigation}
        />,
      );

      fireEvent.press(getByTestId('activity-list-item-row'));

      expect(handleUnifiedSwapsTxHistoryItemClick).not.toHaveBeenCalled();
      expect(navigation.navigate).toHaveBeenCalledWith(
        Routes.ACTIVITY_DETAILS,
        expect.objectContaining({ txIdentifier: 'tx-1' }),
      );
    });

    it('passes the bridge-history entry to the shared row for enrichment', () => {
      const { ActivityListItemRow } = jest.requireMock(
        '../../UI/ActivityListItemRow/ActivityListItemRow',
      );
      const transaction = createTransaction({ type: TransactionType.Swap });
      const bridgeHistoryItem = createBridgeHistoryItem(
        SolScope.Mainnet,
        SolScope.Mainnet,
      );

      render(
        <MultichainAssetDetailsActivityListItem
          item={mapTransactionToItem(transaction)}
          transaction={transaction}
          bridgeHistoryItem={bridgeHistoryItem}
          index={0}
          chainId={SolScope.Mainnet}
          navigation={createNavigation()}
        />,
      );

      expect(ActivityListItemRow.mock.calls[0][0].bridgeHistoryItem).toBe(
        bridgeHistoryItem,
      );
    });
  });
});
