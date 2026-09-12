import React from 'react';
import { act, render } from '@testing-library/react-native';
import { TransactionStatus } from '@metamask/transaction-controller';
import Routes from '../../../constants/navigation/Routes';
import { handleUnifiedSwapsTxHistoryItemClick } from '../Bridge/utils/transaction-history';
import useDecodedTransaction from './hooks/useDecodedTransaction';
import { TransactionElement } from './index';
import TransactionElementView from './TransactionElementView';

jest.mock('react-redux', () => ({
  connect: () => (component: React.ComponentType) => component,
  useSelector: jest.fn(),
}));
jest.mock('./hooks/useDecodedTransaction', () => jest.fn());
jest.mock('./TransactionElementView', () => jest.fn(() => null));
jest.mock('../Bridge/utils/transaction-history', () => ({
  handleUnifiedSwapsTxHistoryItemClick: jest.fn(),
}));

const mockUseDecodedTransaction = jest.mocked(useDecodedTransaction);
const mockTransactionElementView = jest.mocked(TransactionElementView);
const mockHandleBridgeClick = jest.mocked(handleUnifiedSwapsTxHistoryItemClick);

const createProps = () => ({
  assetSymbol: 'ETH',
  bridgeTxHistoryData: {
    bridgeTxHistoryItem: undefined as unknown,
    isBridgeComplete: null,
  },
  cancelUnsignedQRTransaction: jest.fn(),
  i: 3,
  isLedgerAccount: false,
  isQRHardwareAccount: false,
  navigation: {
    navigate: jest.fn(),
  },
  onCancelAction: jest.fn(),
  onPressItem: jest.fn(),
  onSpeedUpAction: jest.fn(),
  selectSelectedAccountGroupInternalAccounts: [],
  selectedAddress: '0x123',
  selectedInternalAccount: undefined,
  showBottomBorder: false,
  signLedgerTransaction: jest.fn(),
  signQRTransaction: jest.fn(),
  swapsTransactions: {},
  ticker: 'ETH',
  trackTransactionDetailClicked: jest.fn(),
  transactions: [],
  tx: {
    id: 'transaction-id',
    chainId: '0x1',
    status: TransactionStatus.confirmed,
    time: 100,
    txParams: {
      from: '0x123',
      to: '0x456',
      nonce: '0x1',
    },
  },
  txChainId: '0x1',
});

const renderContainer = () => {
  const props = createProps();
  render(<TransactionElement {...props} />);
  const viewProps = mockTransactionElementView.mock.calls[0][0];

  return { props, viewProps };
};

describe('TransactionElement container callbacks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDecodedTransaction.mockReturnValue({
      transactionElement: {
        actionKey: 'Send',
        value: '1 ETH',
      },
      transactionDetails: {
        summaryAmount: '1 ETH',
      },
    });
  });

  it('opens the cancellation flow', () => {
    const { props, viewProps } = renderContainer();

    act(() => viewProps.onCancel());

    expect(props.onCancelAction).toHaveBeenCalledWith(true, props.tx);
  });

  it('opens the speed-up flow', () => {
    const { props, viewProps } = renderContainer();

    act(() => viewProps.onSpeedUp());

    expect(props.onSpeedUpAction).toHaveBeenCalledWith(true, props.tx);
  });

  it('opens QR signing', () => {
    const { props, viewProps } = renderContainer();

    act(() => viewProps.onSignQR());

    expect(props.signQRTransaction).toHaveBeenCalledWith(props.tx);
  });

  it('opens Ledger signing', () => {
    const { props, viewProps } = renderContainer();

    act(() => viewProps.onSignLedger());

    expect(props.signLedgerTransaction).toHaveBeenCalledWith(props.tx);
  });

  it('cancels an unsigned QR transaction', () => {
    const { props, viewProps } = renderContainer();

    act(() => viewProps.onCancelUnsignedQR());

    expect(props.cancelUnsignedQRTransaction).toHaveBeenCalledWith(props.tx);
  });

  it('opens the import wallet tip', () => {
    const { props, viewProps } = renderContainer();

    act(() => viewProps.onImportWalletTip());

    expect(props.navigation.navigate).toHaveBeenCalledWith(
      Routes.MODAL.ROOT_MODAL_FLOW,
      {
        screen: Routes.SHEET.IMPORT_WALLET_TIP,
      },
    );
  });

  it('opens legacy transaction details for a standard transaction', () => {
    const { props, viewProps } = renderContainer();

    act(() => viewProps.onPress());

    expect(props.navigation.navigate).toHaveBeenCalledWith(
      Routes.MODAL.ROOT_MODAL_FLOW,
      expect.objectContaining({
        screen: Routes.SHEET.TRANSACTION_DETAILS,
      }),
    );
    expect(props.onPressItem).toHaveBeenCalledWith(props.tx.id, props.i);
    expect(props.trackTransactionDetailClicked).toHaveBeenCalledTimes(1);
  });

  it('delegates bridge transaction presses to unified history navigation', () => {
    const bridgeTxHistoryItem = {
      quote: {
        srcChainId: 1,
        destChainId: 10,
      },
    };
    const props = createProps();
    props.bridgeTxHistoryData.bridgeTxHistoryItem = bridgeTxHistoryItem;
    render(<TransactionElement {...props} />);
    const viewProps = mockTransactionElementView.mock.calls[0][0];

    act(() => viewProps.onPress());

    expect(mockHandleBridgeClick).toHaveBeenCalledWith({
      navigation: props.navigation,
      evmTxMeta: props.tx,
      bridgeTxHistoryItem,
    });
  });
});
