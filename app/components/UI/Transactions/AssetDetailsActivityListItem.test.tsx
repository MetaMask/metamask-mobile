import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import AssetDetailsActivityListItem from './AssetDetailsActivityListItem';
import Routes from '../../../constants/navigation/Routes';
import type { TransactionWithImportTime } from './AssetDetailsActivityListItem.utils';
import {
  ActivityListItemRow,
  resolveActivityListItemTitle,
} from '../ActivityListItemRow/ActivityListItemRow';
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

const usdc = '0x754704bc059f8c67012fed69bc8a327a5aafb603';

const renderItem = (ui: React.ReactElement) =>
  renderWithProvider(ui, {
    state: {
      engine: {
        backgroundState: {
          AssetsController: {
            assetsInfo: {
              [`eip155:143/erc20:${usdc}`]: {
                type: 'erc20',
                symbol: 'USDC',
                decimals: 6,
              },
            },
          },
        },
      },
    },
  });

describe('AssetDetailsActivityListItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders account import marker for transaction import insertion point', () => {
    const navigation = createNavigation();
    const transaction = createTransaction({ insertImportTime: true });

    const { getByTestId } = renderItem(
      <AssetDetailsActivityListItem
        transaction={transaction}
        index={0}
        assetSymbol="ETH"
        chainId="0x1"
        accountImportTime={2000}
        navigation={navigation}
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

    const { queryByTestId } = renderItem(
      <AssetDetailsActivityListItem
        transaction={transaction}
        index={0}
        assetSymbol="ETH"
        chainId="0x1"
        navigation={navigation}
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

    const { getByTestId } = renderItem(
      <AssetDetailsActivityListItem
        transaction={transaction}
        index={0}
        assetSymbol="USDC"
        chainId="0x2105"
        bridgeHistory={bridgeHistory as never}
        navigation={navigation}
      />,
    );

    fireEvent.press(getByTestId('activity-list-item-row'));

    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.ACTIVITY_DETAILS,
      expect.objectContaining({ txIdentifier: '0xabc' }),
    );
    // Neither the legacy details sheet nor the legacy bridge-status screen.
    expect(handleUnifiedSwapsTxHistoryItemClick).not.toHaveBeenCalled();
  });

  it('routes to the ActivityDetails screen when the redesign is enabled', () => {
    const navigation = createNavigation();
    const transaction = createTransaction();

    const { getByTestId } = renderItem(
      <AssetDetailsActivityListItem
        transaction={transaction}
        index={0}
        assetSymbol="ETH"
        chainId="0x1"
        navigation={navigation}
      />,
    );

    fireEvent.press(getByTestId('activity-list-item-row'));

    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.ACTIVITY_DETAILS,
      expect.objectContaining({
        chainId: 'eip155:1',
        txIdentifier: '0xabc',
      }),
    );
  });

  it('routes a transaction without a hash to ActivityDetails using its id as the identifier', () => {
    const navigation = createNavigation();
    const transaction = createTransaction({
      id: 'tx-unsubmitted',
      hash: undefined,
      status: TransactionStatus.approved,
    });

    const { getByTestId } = renderItem(
      <AssetDetailsActivityListItem
        transaction={transaction}
        index={0}
        assetSymbol="ETH"
        chainId="0x1"
        navigation={navigation}
      />,
    );

    fireEvent.press(getByTestId('activity-list-item-row'));

    expect(navigation.navigate).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.ACTIVITY_DETAILS, {
      chainId: 'eip155:1',
      txIdentifier: 'tx-unsubmitted',
    });
  });

  it('resolves token decimals from AssetsController metadata, independent of balances', () => {
    const navigation = createNavigation();

    renderItem(
      <AssetDetailsActivityListItem
        transaction={createTransaction({
          chainId: '0x8f',
          type: TransactionType.tokenMethodTransfer,
          txParams: { from: '0x123', to: usdc, value: '0x0' },
        })}
        index={0}
        assetSymbol="USDC"
        chainId="0x8f"
        navigation={navigation}
      />,
    );

    expect(jest.mocked(ActivityListItemRow).mock.calls[0][0].item).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          token: expect.objectContaining({ decimals: 6 }),
        }),
      }),
    );
  });
});
