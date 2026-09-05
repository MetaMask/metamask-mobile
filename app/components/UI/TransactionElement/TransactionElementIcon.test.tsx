import React from 'react';
import { Image } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { BadgeVariant } from '../../../component-library/components/Badges/Badge';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import { NetworkBadgeSource } from '../AssetOverview/Balance/Balance';
import { hasTransactionType } from '../../Views/confirmations/utils/transaction';
import { TRANSACTION_TYPES } from '../../../util/transactions';
import transactionIconApprove from '../../../images/transaction-icons/approve.png';
import transactionIconInteraction from '../../../images/transaction-icons/interaction.png';
import transactionIconSent from '../../../images/transaction-icons/send.png';
import transactionIconReceived from '../../../images/transaction-icons/receive.png';
import transactionIconSwap from '../../../images/transaction-icons/swap.png';
import transactionIconApproveFailed from '../../../images/transaction-icons/approve-failed.png';
import transactionIconInteractionFailed from '../../../images/transaction-icons/interaction-failed.png';
import transactionIconSentFailed from '../../../images/transaction-icons/send-failed.png';
import transactionIconReceivedFailed from '../../../images/transaction-icons/receive-failed.png';
import transactionIconSwapFailed from '../../../images/transaction-icons/swap-failed.png';
import { mockTheme } from '../../../util/theme';
import createStyles from './styles';
import TransactionElementIcon from './TransactionElementIcon';
import type { DecodedTransactionElement } from './types';

jest.mock('../../../component-library/components/Badges/BadgeWrapper', () =>
  jest.fn(({ children }: { children: React.ReactNode }) => children),
);
jest.mock('../../../component-library/components/Badges/Badge', () => ({
  __esModule: true,
  default: jest.fn(() => null),
  BadgeVariant: { Network: 'Network' },
}));
jest.mock('../AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn(() => ({ uri: 'network-badge' })),
}));
jest.mock('../../Views/confirmations/utils/transaction', () => ({
  hasTransactionType: jest.fn(() => false),
}));

const mockBadgeWrapper = jest.mocked(BadgeWrapper);
const mockNetworkBadgeSource = jest.mocked(NetworkBadgeSource);
const mockHasTransactionType = jest.mocked(hasTransactionType);
const styles = createStyles(mockTheme.colors, mockTheme.typography);

const createTransaction = (
  overrides: Partial<TransactionMeta> = {},
): TransactionMeta =>
  ({
    id: 'transaction-id',
    chainId: '0x1',
    status: 'confirmed',
    time: 1,
    txParams: {
      from: '0x123',
      to: '0x456',
    },
    ...overrides,
  }) as TransactionMeta;

const renderIcon = (
  transactionType: string | undefined,
  txOverrides: Partial<TransactionMeta> = {},
  transactions: TransactionMeta[] = [],
) =>
  render(
    <TransactionElementIcon
      transactionElement={
        {
          actionKey: 'Transaction',
          transactionType,
        } as DecodedTransactionElement
      }
      tx={createTransaction(txOverrides)}
      transactions={transactions}
      styles={styles}
    />,
  );

const successfulIcons = [
  [TRANSACTION_TYPES.SENT_TOKEN, transactionIconSent],
  [TRANSACTION_TYPES.SENT_COLLECTIBLE, transactionIconSent],
  [TRANSACTION_TYPES.SENT, transactionIconSent],
  [TRANSACTION_TYPES.RECEIVED_TOKEN, transactionIconReceived],
  [TRANSACTION_TYPES.RECEIVED_COLLECTIBLE, transactionIconReceived],
  [TRANSACTION_TYPES.RECEIVED, transactionIconReceived],
  [TRANSACTION_TYPES.SITE_INTERACTION, transactionIconInteraction],
  [TRANSACTION_TYPES.BATCH_SELL_TRANSACTION, transactionIconSwap],
  [TRANSACTION_TYPES.SWAPS_TRANSACTION, transactionIconSwap],
  [TRANSACTION_TYPES.BRIDGE_TRANSACTION, transactionIconSwap],
  [TRANSACTION_TYPES.APPROVE, transactionIconApprove],
  [TRANSACTION_TYPES.INCREASE_ALLOWANCE, transactionIconApprove],
  [TRANSACTION_TYPES.SET_APPROVAL_FOR_ALL, transactionIconApprove],
] as const;

const failedIcons = [
  [TRANSACTION_TYPES.SENT, transactionIconSentFailed],
  [TRANSACTION_TYPES.RECEIVED, transactionIconReceivedFailed],
  [TRANSACTION_TYPES.SITE_INTERACTION, transactionIconInteractionFailed],
  [TRANSACTION_TYPES.SWAPS_TRANSACTION, transactionIconSwapFailed],
  [TRANSACTION_TYPES.APPROVE, transactionIconApproveFailed],
] as const;

describe('TransactionElementIcon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasTransactionType.mockReturnValue(false);
  });

  it.each(successfulIcons)('renders the %s icon', (transactionType, icon) => {
    renderIcon(transactionType);

    const image = screen.UNSAFE_getByType(Image);

    expect(image.props.source).toBe(icon);
  });

  it.each(failedIcons)(
    'renders the failed %s icon',
    (transactionType, icon) => {
      renderIcon(transactionType, { status: TransactionStatus.failed });

      const image = screen.UNSAFE_getByType(Image);

      expect(image.props.source).toBe(icon);
    },
  );

  it('renders no transaction icon for an unknown decoded type', () => {
    renderIcon('unknown');

    const image = screen.UNSAFE_getByType(Image);

    expect(image.props.source).toBeUndefined();
  });

  it('uses the required transaction chain for a perps deposit', () => {
    const requiredTransaction = createTransaction({
      id: 'required-transaction',
      chainId: '0x89',
    });

    renderIcon(
      TRANSACTION_TYPES.SENT,
      {
        type: TransactionType.perpsDeposit,
        requiredTransactionIds: ['required-transaction'],
      },
      [requiredTransaction],
    );

    expect(mockNetworkBadgeSource).toHaveBeenCalledWith('0x89');
  });

  it('uses the transaction chain when a required perps transaction is absent', () => {
    renderIcon(TRANSACTION_TYPES.SENT, {
      type: TransactionType.perpsDeposit,
      requiredTransactionIds: ['missing-transaction'],
    });

    expect(mockNetworkBadgeSource).toHaveBeenCalledWith('0x1');
  });

  it('uses the MetaMask Pay chain for a withdrawal', () => {
    mockHasTransactionType.mockReturnValue(true);

    renderIcon(TRANSACTION_TYPES.SENT, {
      metamaskPay: { chainId: '0xa' },
    });

    expect(mockNetworkBadgeSource).toHaveBeenCalledWith('0xa');
  });

  it('configures the network badge', () => {
    renderIcon(TRANSACTION_TYPES.SENT);

    expect(mockBadgeWrapper).toHaveBeenCalledWith(
      expect.objectContaining({
        badgeElement: expect.objectContaining({
          props: expect.objectContaining({
            variant: BadgeVariant.Network,
            imageSource: { uri: 'network-badge' },
            isScaled: false,
            size: AvatarSize.Xs,
          }),
        }),
      }),
      undefined,
    );
  });
});
