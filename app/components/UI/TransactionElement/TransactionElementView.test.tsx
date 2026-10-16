import React from 'react';
import {
  TouchableHighlight,
  TouchableOpacity,
  type TextStyle,
} from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { strings } from '../../../../locales/i18n';
import { mockTheme } from '../../../util/theme';
import { isTestNet } from '../../../util/networks';
import StatusText from '../../Base/StatusText';
import { useBridgeTxHistoryData } from '../../../util/bridge/hooks/useBridgeTxHistoryData';
import BridgeActivityItemTxSegments from '../Bridge/components/TransactionDetails/BridgeActivityItemTxSegments';
import {
  getSwapBridgeTxActivityTitle,
  isBridgeTxHistoryItemBridge,
} from '../Bridge/utils/transaction-history';
import { hasGasFeeTokenSelected } from '../../Views/confirmations/utils/transaction';
import TransactionElementIcon from './TransactionElementIcon';
import TransactionElementView from './TransactionElementView';
import createStyles from './styles';
import type { DecodedTransactionElement } from './types';

jest.mock('../../../util/networks', () => ({
  isTestNet: jest.fn(() => false),
}));
jest.mock('../../../util/bridge/hooks/useBridgeTxHistoryData', () => ({
  FINAL_NON_CONFIRMED_STATUSES: ['failed', 'dropped', 'rejected'],
  useBridgeTxHistoryData: jest.fn(),
}));
jest.mock(
  '../Bridge/components/TransactionDetails/BridgeActivityItemTxSegments',
  () => jest.fn(() => null),
);
jest.mock('../Bridge/utils/transaction-history', () => ({
  getSwapBridgeTxActivityTitle: jest.fn(),
  isBridgeTxHistoryItemBridge: jest.fn(() => false),
}));
jest.mock('../../Views/confirmations/utils/transaction', () => ({
  hasGasFeeTokenSelected: jest.fn(() => false),
}));
jest.mock('../../Base/StatusText', () => jest.fn(() => null));
jest.mock('./TransactionElementIcon', () => jest.fn(() => null));

const mockIsTestNet = jest.mocked(isTestNet);
const mockBridgeSegments = jest.mocked(BridgeActivityItemTxSegments);
const mockGetBridgeTitle = jest.mocked(getSwapBridgeTxActivityTitle);
const mockIsBridgeHistoryItem = jest.mocked(isBridgeTxHistoryItemBridge);
const mockHasGasFeeTokenSelected = jest.mocked(hasGasFeeTokenSelected);
const mockStatusText = jest.mocked(StatusText);
const mockTransactionElementIcon = jest.mocked(TransactionElementIcon);

const styles = {
  ...createStyles(mockTheme.colors, mockTheme.typography),
  infoIcon: {} as TextStyle,
};

type BridgeTxHistoryData = ReturnType<typeof useBridgeTxHistoryData>;

interface RenderViewOptions {
  accountImportTime?: number;
  bridgeTxHistoryData?: BridgeTxHistoryData;
  isDecoded?: boolean;
  isLedgerAccount?: boolean;
  isQRHardwareAccount?: boolean;
  showBottomBorder?: boolean;
  transactionElement?: DecodedTransactionElement;
  transactionDetails?: Record<string, unknown>;
  transactions?: TransactionMeta[];
  tx?: TransactionMeta & {
    insertImportTime?: boolean;
    isSmartTransaction?: boolean;
  };
}

const createTransaction = (
  overrides: Partial<TransactionMeta> & {
    insertImportTime?: boolean;
    isSmartTransaction?: boolean;
  } = {},
) =>
  ({
    id: 'transaction-id',
    chainId: '0x1',
    status: TransactionStatus.confirmed,
    time: 100,
    txParams: {
      from: '0x123',
      to: '0x456',
    },
    ...overrides,
  }) as TransactionMeta & {
    insertImportTime?: boolean;
    isSmartTransaction?: boolean;
  };

const createBridgeData = (
  status: string,
  overrides: Partial<BridgeTxHistoryData> = {},
): BridgeTxHistoryData =>
  ({
    bridgeTxHistoryItem: {
      status: { status },
      quote: { intent: { id: 'intent-id' } },
    },
    is7702Batch: false,
    isBridgeComplete: false,
    ...overrides,
  }) as unknown as BridgeTxHistoryData;

const renderView = (options: RenderViewOptions = {}) => {
  const callbacks = {
    onCancel: jest.fn(),
    onCancelUnsignedQR: jest.fn(),
    onImportWalletTip: jest.fn(),
    onPress: jest.fn(),
    onSignLedger: jest.fn(),
    onSignQR: jest.fn(),
    onSpeedUp: jest.fn(),
  };
  const transactionElement =
    options.isDecoded === false
      ? undefined
      : (options.transactionElement ?? {
          actionKey: 'Send',
          value: '1 ETH',
          fiatValue: '$3,000',
          transactionType: 'transaction_sent',
        });
  const transactionDetails =
    options.isDecoded === false
      ? undefined
      : (options.transactionDetails ?? { summaryAmount: '1 ETH' });

  const view = render(
    <TransactionElementView
      accountImportTime={options.accountImportTime}
      bridgeTxHistoryData={
        options.bridgeTxHistoryData ?? {
          bridgeTxHistoryItem: undefined,
          isBridgeComplete: null,
        }
      }
      colors={mockTheme.colors}
      i={7}
      isLedgerAccount={options.isLedgerAccount}
      isQRHardwareAccount={options.isQRHardwareAccount}
      showBottomBorder={options.showBottomBorder}
      styles={styles}
      transactionElement={transactionElement}
      transactionDetails={transactionDetails}
      transactions={options.transactions ?? []}
      tx={options.tx ?? createTransaction()}
      txTime="Jul 27"
      {...callbacks}
    />,
  );

  return { ...view, ...callbacks };
};

describe('TransactionElementView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTestNet.mockReturnValue(false);
    mockIsBridgeHistoryItem.mockReturnValue(false);
    mockHasGasFeeTokenSelected.mockReturnValue(false);
    mockGetBridgeTitle.mockReturnValue(undefined);
  });

  it('renders a pending row while decoded details are absent', () => {
    renderView({ isDecoded: false });

    expect(mockStatusText).toHaveBeenCalledWith(
      expect.objectContaining({
        testID: 'transaction-status-7',
        status: TransactionStatus.confirmed,
      }),
      undefined,
    );
    expect(screen.getByText('...')).toBeOnTheScreen();
  });

  it('disables row presses while decoded details are absent', () => {
    const { onPress } = renderView({ isDecoded: false });

    fireEvent.press(screen.UNSAFE_getByType(TouchableHighlight));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('invokes the row callback after decoding completes', () => {
    const { onPress } = renderView();

    fireEvent.press(screen.UNSAFE_getByType(TouchableHighlight));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses the bordered row style when requested', () => {
    renderView({ showBottomBorder: true });

    const row = screen.UNSAFE_getByType(TouchableHighlight);

    expect(row.props.style).toBe(styles.rowWithBorder);
  });

  it('renders decoded values for a mainnet transaction', () => {
    renderView();

    expect(screen.getByText('Send')).toBeOnTheScreen();
    expect(screen.getByText('1 ETH')).toBeOnTheScreen();
    expect(screen.getByText('$3,000')).toBeOnTheScreen();
    expect(mockTransactionElementIcon).toHaveBeenCalledTimes(1);
  });

  it('omits the fiat value for a testnet transaction', () => {
    mockIsTestNet.mockReturnValue(true);

    renderView();

    expect(screen.queryByText('$3,000')).not.toBeOnTheScreen();
    expect(screen.getByText('1 ETH')).toBeOnTheScreen();
  });

  it('omits amount fields when decoded value is empty', () => {
    renderView({
      transactionElement: {
        actionKey: 'Contract interaction',
        value: '',
      },
    });

    expect(screen.queryByText('$3,000')).not.toBeOnTheScreen();
    expect(screen.queryByText('1 ETH')).not.toBeOnTheScreen();
  });

  it('invokes speed-up from submitted transaction actions', () => {
    const { onSpeedUp } = renderView({
      tx: createTransaction({ status: TransactionStatus.submitted }),
    });

    fireEvent.press(screen.getByText(strings('transaction.speedup')));

    expect(onSpeedUp).toHaveBeenCalledTimes(1);
  });

  it('invokes cancellation from submitted transaction actions', () => {
    const { onCancel } = renderView({
      tx: createTransaction({ status: TransactionStatus.submitted }),
    });

    fireEvent.press(screen.getByText(strings('transaction.cancel')));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('invokes QR signing for an approved QR transaction', () => {
    const { onSignQR } = renderView({
      isQRHardwareAccount: true,
      tx: createTransaction({ status: TransactionStatus.approved }),
    });

    fireEvent.press(
      screen.getByText(strings('transaction.sign_with_keystone')),
    );

    expect(onSignQR).toHaveBeenCalledTimes(1);
  });

  it('invokes unsigned QR cancellation for an approved QR transaction', () => {
    const { onCancelUnsignedQR } = renderView({
      isQRHardwareAccount: true,
      tx: createTransaction({ status: TransactionStatus.approved }),
    });

    fireEvent.press(screen.getByText(strings('transaction.cancel')));

    expect(onCancelUnsignedQR).toHaveBeenCalledTimes(1);
  });

  it('invokes Ledger signing for an approved Ledger transaction', () => {
    const { onSignLedger } = renderView({
      isLedgerAccount: true,
      tx: createTransaction({ status: TransactionStatus.approved }),
    });

    fireEvent.press(screen.getByText(strings('transaction.sign_with_ledger')));

    expect(onSignLedger).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'smart',
      createTransaction({
        status: TransactionStatus.submitted,
        isSmartTransaction: true,
      }),
    ],
    [
      'bridge',
      createTransaction({
        status: TransactionStatus.submitted,
        type: TransactionType.bridge,
      }),
    ],
    [
      'gas-fee-token',
      createTransaction({ status: TransactionStatus.submitted }),
    ],
  ])('omits normal actions for a %s transaction', (condition, tx) => {
    if (condition === 'gas-fee-token') {
      mockHasGasFeeTokenSelected.mockReturnValue(true);
    }

    renderView({ tx });

    expect(
      screen.queryByText(strings('transaction.speedup')),
    ).not.toBeOnTheScreen();
  });

  it.each([
    ['PENDING', 'pending'],
    ['COMPLETE', TransactionStatus.confirmed],
    ['FAILED', TransactionStatus.failed],
    ['SUBMITTED', TransactionStatus.submitted],
    ['UNKNOWN', TransactionStatus.failed],
  ])('maps %s bridge intent status to %s', (intentStatus, expectedStatus) => {
    const bridgeTxHistoryData = createBridgeData(intentStatus, {
      isBridgeComplete: true,
    });
    mockIsBridgeHistoryItem.mockReturnValue(true);

    renderView({ bridgeTxHistoryData });

    expect(mockStatusText).toHaveBeenCalledWith(
      expect.objectContaining({
        status: expectedStatus,
      }),
      undefined,
    );
  });

  it('renders bridge progress segments for an incomplete bridge', () => {
    const bridgeTxHistoryData = createBridgeData('COMPLETE');
    mockIsBridgeHistoryItem.mockReturnValue(true);

    renderView({ bridgeTxHistoryData });

    expect(mockBridgeSegments).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionStatus: TransactionStatus.confirmed,
      }),
      undefined,
    );
    expect(mockStatusText).not.toHaveBeenCalled();
  });

  it('uses the bridge activity title when available', () => {
    const bridgeTxHistoryData = createBridgeData('COMPLETE', {
      isBridgeComplete: true,
      is7702Batch: true,
    });
    mockGetBridgeTitle.mockReturnValue('Bridge complete');

    renderView({ bridgeTxHistoryData });

    expect(screen.getByText('Bridge complete')).toBeOnTheScreen();
    expect(mockGetBridgeTitle).toHaveBeenCalledWith(
      bridgeTxHistoryData.bridgeTxHistoryItem,
      true,
    );
  });

  it('renders import time before an older transaction', () => {
    const { onImportWalletTip } = renderView({
      accountImportTime: 200,
      tx: createTransaction({ insertImportTime: true, time: 100 }),
    });

    fireEvent.press(screen.UNSAFE_getByType(TouchableOpacity));

    expect(onImportWalletTip).toHaveBeenCalledTimes(1);
  });

  it('renders import time after a newer transaction', () => {
    const { onImportWalletTip } = renderView({
      accountImportTime: 50,
      tx: createTransaction({ insertImportTime: true, time: 100 }),
    });

    fireEvent.press(screen.UNSAFE_getByType(TouchableOpacity));

    expect(onImportWalletTip).toHaveBeenCalledTimes(1);
  });

  it('omits import time when the transaction flag is absent', () => {
    renderView({
      accountImportTime: 200,
      tx: createTransaction({ time: 100 }),
    });

    expect(screen.UNSAFE_queryByType(TouchableOpacity)).not.toBeOnTheScreen();
  });
});
