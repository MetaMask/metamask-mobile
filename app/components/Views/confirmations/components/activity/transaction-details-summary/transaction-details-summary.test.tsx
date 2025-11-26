import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { TransactionDetailsSummary } from './transaction-details-summary';
import { useBridgeTxHistoryData } from '../../../../../../util/bridge/hooks/useBridgeTxHistoryData';
import { transactionIdMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { strings } from '../../../../../../../locales/i18n';
import { fireEvent } from '@testing-library/react-native';
import { useMultichainBlockExplorerTxUrl } from '../../../../../UI/Bridge/hooks/useMultichainBlockExplorerTxUrl';
import Routes from '../../../../../../constants/navigation/Routes';
import { StatusTypes } from '@metamask/bridge-controller';
import { selectBridgeHistoryForAccount } from '../../../../../../selectors/bridgeStatusController';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { useNetworkName } from '../../../hooks/useNetworkName';
import { Hex } from '@metamask/utils';
import { useTokenAmount } from '../../../hooks/useTokenAmount';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { POLYGON_USDCE } from '../../../constants/predict';

const mockNavigate = jest.fn();

jest.mock('../../../hooks/activity/useTransactionDetails');
jest.mock('../../../../../../util/bridge/hooks/useBridgeTxHistoryData');
jest.mock('../../../../../UI/Bridge/hooks/useMultichainBlockExplorerTxUrl');
jest.mock('../../../../../../selectors/bridgeStatusController');
jest.mock('../../../hooks/useNetworkName');
jest.mock('../../../hooks/useTokenAmount');
jest.mock('../../../hooks/tokens/useTokenWithBalance');

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const REQUIRED_TRANSACTION_ID_MOCK = '123-456';
const REQUIRED_TRANSACTION_ID_2_MOCK = '789-012';
const SYMBOL_MOCK = 'TST1';
const SYMBOL_2_MOCK = 'TST2';
const BATCH_ID_MOCK = '0x123';
const SOURCE_NETWORK_NAME_MOCK = 'Source Network';
const TARGET_NETWORK_NAME_MOCK = 'Target Network';
const SOURCE_CHAIN_ID_MOCK = '0x1' as Hex;
const TARGET_CHAIN_ID_MOCK = '0x2' as Hex;
const COMPLETION_TIME_MOCK = 1755819285723;
const RECEIVE_HASH_MOCK = '0x456' as Hex;

const TRANSACTION_META_MOCK = {
  id: transactionIdMock,
  chainId: SOURCE_CHAIN_ID_MOCK,
  submittedTime: 1755719285723,
};

function render({
  transactions,
}: {
  transactions: Partial<TransactionMeta>[];
}) {
  return renderWithProvider(<TransactionDetailsSummary />, {
    state: {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions,
          },
        },
      },
    },
  });
}

const BLOCK_EXPLORER_URL_MOCK = 'test.com';
const BLOCK_EXPLORER_TITLE_MOCK = 'Test Title';

describe('TransactionDetailsSummary', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);
  const useBridgeTxHistoryDataMock = jest.mocked(useBridgeTxHistoryData);
  const useNetworkNameMock = jest.mocked(useNetworkName);
  const useTokenAmountMock = jest.mocked(useTokenAmount);
  const useTokenWithBalanceMock = jest.mocked(useTokenWithBalance);

  const useMultichainBlockExplorerTxUrlMock = jest.mocked(
    useMultichainBlockExplorerTxUrl,
  );

  const selectBridgeHistoryForAccountMock = jest.mocked(
    selectBridgeHistoryForAccount,
  );

  /**
   * Mock the bridge history item in the state.
   */
  function mockBridgeHistoryItem() {
    useBridgeTxHistoryDataMock.mockReturnValue({
      bridgeTxHistoryItem: {
        completionTime: COMPLETION_TIME_MOCK,
        quote: {
          srcAsset: {
            symbol: SYMBOL_MOCK,
          },
          destAsset: {
            symbol: SYMBOL_2_MOCK,
          },
          destChainId: Number(TARGET_CHAIN_ID_MOCK),
        },
        status: {
          status: StatusTypes.COMPLETE,
          destChain: {
            txHash: RECEIVE_HASH_MOCK,
          },
        },
      },
    } as unknown as ReturnType<typeof useBridgeTxHistoryData>);
  }

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        id: transactionIdMock,
      } as unknown as TransactionMeta,
    });

    useMultichainBlockExplorerTxUrlMock.mockReturnValue({
      explorerTxUrl: BLOCK_EXPLORER_URL_MOCK,
      explorerName: BLOCK_EXPLORER_TITLE_MOCK,
    } as ReturnType<typeof useMultichainBlockExplorerTxUrl>);

    selectBridgeHistoryForAccountMock.mockReturnValue({});

    useNetworkNameMock.mockImplementation((chainId) => {
      switch (chainId) {
        case SOURCE_CHAIN_ID_MOCK:
          return SOURCE_NETWORK_NAME_MOCK;
        case TARGET_CHAIN_ID_MOCK:
          return TARGET_NETWORK_NAME_MOCK;
        default:
          return undefined;
      }
    });

    useBridgeTxHistoryDataMock.mockReturnValue({
      bridgeTxHistoryItem: undefined,
      isBridgeComplete: null,
    });

    useTokenAmountMock.mockReturnValue({} as ReturnType<typeof useTokenAmount>);

    useTokenWithBalanceMock.mockReturnValue(
      {} as ReturnType<typeof useTokenWithBalance>,
    );
  });

  it('renders perps deposit line title', () => {
    const { getByText } = render({
      transactions: [
        { ...TRANSACTION_META_MOCK, type: TransactionType.perpsDeposit },
      ],
    });

    expect(
      getByText(
        strings('transaction_details.summary_title.bridge_receive', {
          targetSymbol: 'USDC',
          targetChain: 'Hyperliquid',
        }),
      ),
    ).toBeDefined();
  });

  it('renders predict deposit line title', () => {
    const { getByText } = render({
      transactions: [
        {
          ...TRANSACTION_META_MOCK,
          nestedTransactions: [{ type: TransactionType.predictDeposit }],
        },
      ],
    });

    expect(
      getByText(
        strings('transaction_details.summary_title.bridge_receive', {
          targetSymbol: POLYGON_USDCE.symbol,
          targetChain: 'Polygon',
        }),
      ),
    ).toBeDefined();
  });

  it('renders bridge send line title', () => {
    mockBridgeHistoryItem();

    const { getByText } = render({
      transactions: [
        { ...TRANSACTION_META_MOCK, type: TransactionType.bridge },
      ],
    });

    expect(
      getByText(
        strings('transaction_details.summary_title.bridge_send', {
          sourceSymbol: SYMBOL_MOCK,
          sourceChain: SOURCE_NETWORK_NAME_MOCK,
        }),
      ),
    ).toBeDefined();
  });

  it('renders bridge receive line title', () => {
    mockBridgeHistoryItem();

    const { getByText } = render({
      transactions: [
        { ...TRANSACTION_META_MOCK, type: TransactionType.bridge },
      ],
    });

    expect(
      getByText(
        strings('transaction_details.summary_title.bridge_receive', {
          targetSymbol: SYMBOL_2_MOCK,
          targetChain: TARGET_NETWORK_NAME_MOCK,
        }),
      ),
    ).toBeDefined();
  });

  it('renders bridge line alternate title if symbols loading', () => {
    useBridgeTxHistoryDataMock.mockReturnValue({
      bridgeTxHistoryItem: {
        quote: {
          destChainId: Number(TARGET_CHAIN_ID_MOCK),
        },
        status: {
          status: StatusTypes.COMPLETE,
        },
      },
    } as unknown as ReturnType<typeof useBridgeTxHistoryData>);

    const { getByText } = render({
      transactions: [
        { ...TRANSACTION_META_MOCK, type: TransactionType.bridge },
      ],
    });

    expect(
      getByText(
        strings('transaction_details.summary_title.bridge_send_loading'),
      ),
    ).toBeDefined();

    expect(
      getByText(
        strings('transaction_details.summary_title.bridge_receive_loading'),
      ),
    ).toBeDefined();
  });

  it('renders bridge approval line title', () => {
    selectBridgeHistoryForAccountMock.mockReturnValue({
      test: {
        approvalTxId: TRANSACTION_META_MOCK.id,
        quote: {
          srcAsset: { symbol: SYMBOL_MOCK },
        },
      } as BridgeHistoryItem,
    });

    const { getByText } = render({
      transactions: [
        { ...TRANSACTION_META_MOCK, type: TransactionType.bridgeApproval },
      ],
    });

    expect(
      getByText(
        strings('transaction_details.summary_title.bridge_approval', {
          approveSymbol: SYMBOL_MOCK,
        }),
      ),
    ).toBeDefined();
  });

  it('renders bridge approval line alternate title if symbol loading', () => {
    selectBridgeHistoryForAccountMock.mockReturnValue({
      test: {
        approvalTxId: TRANSACTION_META_MOCK.id,
        quote: {},
      } as BridgeHistoryItem,
    });

    const { getByText } = render({
      transactions: [
        { ...TRANSACTION_META_MOCK, type: TransactionType.bridgeApproval },
      ],
    });

    expect(
      getByText(
        strings('transaction_details.summary_title.bridge_approval_loading'),
      ),
    ).toBeDefined();
  });

  it('renders swap approval line title', () => {
    const { getByText } = render({
      transactions: [
        { ...TRANSACTION_META_MOCK, type: TransactionType.swapApproval },
      ],
    });

    expect(
      getByText(strings('transaction_details.summary_title.swap_approval')),
    ).toBeDefined();
  });

  it('renders swap line title', () => {
    const { getByText } = render({
      transactions: [{ ...TRANSACTION_META_MOCK, type: TransactionType.swap }],
    });

    expect(
      getByText(strings('transaction_details.summary_title.swap')),
    ).toBeDefined();
  });

  it('renders default line title', () => {
    selectBridgeHistoryForAccountMock.mockReturnValue({
      test: {
        approvalTxId: TRANSACTION_META_MOCK.id,
        quote: {
          srcAsset: { symbol: SYMBOL_MOCK },
        },
      } as BridgeHistoryItem,
    });

    const { getByText } = render({
      transactions: [
        { ...TRANSACTION_META_MOCK, type: TransactionType.contractInteraction },
      ],
    });

    expect(
      getByText(strings('transaction_details.summary_title.default')),
    ).toBeDefined();
  });

  it('renders submitted time', () => {
    const { getByText } = render({
      transactions: [
        { ...TRANSACTION_META_MOCK, type: TransactionType.bridge },
      ],
    });

    expect(getByText('3:48 PM • Aug 20, 2025')).toBeDefined();
  });

  it('renders time if no submitted time', () => {
    const { getByText } = render({
      transactions: [
        {
          ...TRANSACTION_META_MOCK,
          submittedTime: undefined,
          time: TRANSACTION_META_MOCK.submittedTime,
          type: TransactionType.bridge,
        },
      ],
    });

    expect(getByText('3:48 PM • Aug 20, 2025')).toBeDefined();
  });

  it('renders completion time if bridge receive', () => {
    mockBridgeHistoryItem();

    const { getByText } = render({
      transactions: [
        {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.bridge,
        },
      ],
    });

    expect(getByText('7:34 PM • Aug 21, 2025')).toBeDefined();
  });

  it('renders lines for required transactions', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        id: transactionIdMock,
        requiredTransactionIds: [
          REQUIRED_TRANSACTION_ID_MOCK,
          REQUIRED_TRANSACTION_ID_2_MOCK,
        ],
      } as unknown as TransactionMeta,
    });

    const { getByText } = render({
      transactions: [
        {
          ...TRANSACTION_META_MOCK,
          id: REQUIRED_TRANSACTION_ID_MOCK,
          type: TransactionType.contractInteraction,
        },
        {
          ...TRANSACTION_META_MOCK,
          id: REQUIRED_TRANSACTION_ID_2_MOCK,
          type: TransactionType.swap,
        },
      ],
    });

    expect(
      getByText(strings('transaction_details.summary_title.default')),
    ).toBeDefined();

    expect(
      getByText(strings('transaction_details.summary_title.swap')),
    ).toBeDefined();
  });

  it('renders lines for batch transactions', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        id: transactionIdMock,
        batchId: BATCH_ID_MOCK,
      } as unknown as TransactionMeta,
    });

    const { getByText } = render({
      transactions: [
        {
          ...TRANSACTION_META_MOCK,
          id: REQUIRED_TRANSACTION_ID_MOCK,
          batchId: BATCH_ID_MOCK,
          type: TransactionType.contractInteraction,
        },
        {
          ...TRANSACTION_META_MOCK,
          id: REQUIRED_TRANSACTION_ID_2_MOCK,
          batchId: BATCH_ID_MOCK,
          type: TransactionType.swap,
        },
      ],
    });

    expect(
      getByText(strings('transaction_details.summary_title.default')),
    ).toBeDefined();

    expect(
      getByText(strings('transaction_details.summary_title.swap')),
    ).toBeDefined();
  });

  it('navigates to block explorer', () => {
    const { getByTestId } = render({
      transactions: [
        { ...TRANSACTION_META_MOCK, type: TransactionType.perpsDeposit },
      ],
    });

    fireEvent.press(getByTestId('block-explorer-button'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: BLOCK_EXPLORER_URL_MOCK,
        title: BLOCK_EXPLORER_TITLE_MOCK,
      },
    });
  });

  it('navigates to receive hash block explorer', () => {
    mockBridgeHistoryItem();

    render({
      transactions: [
        { ...TRANSACTION_META_MOCK, type: TransactionType.bridge },
      ],
    });

    expect(useMultichainBlockExplorerTxUrlMock).toHaveBeenCalledWith({
      chainId: Number(TARGET_CHAIN_ID_MOCK),
      txHash: RECEIVE_HASH_MOCK,
    });
  });
});
