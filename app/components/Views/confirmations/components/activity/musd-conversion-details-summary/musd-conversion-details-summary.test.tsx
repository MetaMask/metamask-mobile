import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { TransactionDetailsSummary } from '../transaction-details-summary/transaction-details-summary';
import { useBridgeTxHistoryData } from '../../../../../../util/bridge/hooks/useBridgeTxHistoryData';
import { transactionIdMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { strings } from '../../../../../../../locales/i18n';
import { useMultichainBlockExplorerTxUrl } from '../../../../../UI/Bridge/hooks/useMultichainBlockExplorerTxUrl';
import { selectBridgeHistoryForAccount } from '../../../../../../selectors/bridgeStatusController';
import { useNetworkName } from '../../../hooks/useNetworkName';
import { Hex } from '@metamask/utils';
import { useTokenAmount } from '../../../hooks/useTokenAmount';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';

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
    navigate: jest.fn(),
  }),
}));

const SYMBOL_MOCK = 'TST1';
const SOURCE_NETWORK_NAME_MOCK = 'Source Network';
const SOURCE_CHAIN_ID_MOCK = '0x1' as Hex;
const TARGET_CHAIN_ID_MOCK = '0x2' as Hex;

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

describe('MusdConversionSummary', () => {
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

  const MUSD_SEND_TX_ID = 'musd-send-tx-id';
  const MUSD_RECEIVE_TX_ID = 'musd-receive-tx-id';
  const MUSD_RECEIVE_HASH = '0x789abc' as Hex;
  const SEND_HASH = '0x456def' as Hex;

  beforeEach(() => {
    jest.resetAllMocks();

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
          return 'Target Network';
        default:
          return undefined;
      }
    });

    useBridgeTxHistoryDataMock.mockReturnValue({
      bridgeTxHistoryItem: undefined,
      isBridgeComplete: null,
    });

    useTokenAmountMock.mockReturnValue({} as ReturnType<typeof useTokenAmount>);

    useTokenWithBalanceMock.mockReturnValue({
      symbol: SYMBOL_MOCK,
    } as ReturnType<typeof useTokenWithBalance>);

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        id: transactionIdMock,
        chainId: SOURCE_CHAIN_ID_MOCK,
        submittedTime: TRANSACTION_META_MOCK.submittedTime,
        type: TransactionType.musdConversion,
        requiredTransactionIds: [MUSD_SEND_TX_ID, MUSD_RECEIVE_TX_ID],
        metamaskPay: {
          chainId: SOURCE_CHAIN_ID_MOCK,
          tokenAddress: '0x123',
        },
      } as unknown as TransactionMeta,
    });
  });

  it('renders exactly 2 lines for mUSD conversion', () => {
    const { getByText } = render({
      transactions: [
        {
          id: MUSD_SEND_TX_ID,
          chainId: SOURCE_CHAIN_ID_MOCK,
          hash: SEND_HASH,
          type: TransactionType.relayDeposit,
        },
        {
          id: MUSD_RECEIVE_TX_ID,
          chainId: SOURCE_CHAIN_ID_MOCK,
          hash: MUSD_RECEIVE_HASH,
          transferInformation: {
            contractAddress: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
            decimals: 6,
            symbol: 'MUSD',
          },
        },
      ],
    });

    // Sent line
    expect(
      getByText(
        strings('transaction_details.summary_title.musd_convert_send', {
          sourceSymbol: SYMBOL_MOCK,
          sourceChain: SOURCE_NETWORK_NAME_MOCK,
        }),
      ),
    ).toBeDefined();

    // Receive line
    expect(
      getByText(
        strings('transaction_details.summary_title.bridge_receive', {
          targetSymbol: 'mUSD',
          targetChain: SOURCE_NETWORK_NAME_MOCK,
        }),
      ),
    ).toBeDefined();
  });

  it('renders sent line with loading state when source token is not available', () => {
    useTokenWithBalanceMock.mockReturnValue(
      {} as ReturnType<typeof useTokenWithBalance>,
    );

    const { getByText } = render({
      transactions: [],
    });

    expect(
      getByText(
        strings('transaction_details.summary_title.bridge_send_loading'),
      ),
    ).toBeDefined();
  });

  it('uses receive transaction hash for receive line block explorer link', () => {
    render({
      transactions: [
        {
          id: MUSD_SEND_TX_ID,
          chainId: SOURCE_CHAIN_ID_MOCK,
          hash: SEND_HASH,
          type: TransactionType.relayDeposit,
        },
        {
          id: MUSD_RECEIVE_TX_ID,
          chainId: SOURCE_CHAIN_ID_MOCK,
          hash: MUSD_RECEIVE_HASH,
          transferInformation: {
            contractAddress: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
            decimals: 6,
            symbol: 'MUSD',
          },
        },
      ],
    });

    // Receive line uses the mUSD receive transaction hash
    expect(useMultichainBlockExplorerTxUrlMock).toHaveBeenCalledWith({
      chainId: Number(SOURCE_CHAIN_ID_MOCK),
      txHash: MUSD_RECEIVE_HASH,
    });
  });

  it('falls back to transactionMeta.hash when no separate receive transaction exists', () => {
    const PARENT_TX_HASH = '0xparenthash' as Hex;

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        id: transactionIdMock,
        chainId: SOURCE_CHAIN_ID_MOCK,
        submittedTime: TRANSACTION_META_MOCK.submittedTime,
        type: TransactionType.musdConversion,
        requiredTransactionIds: [MUSD_SEND_TX_ID],
        hash: PARENT_TX_HASH,
        metamaskPay: {
          chainId: SOURCE_CHAIN_ID_MOCK,
          tokenAddress: '0x123',
        },
      } as unknown as TransactionMeta,
    });

    render({
      transactions: [
        {
          id: MUSD_SEND_TX_ID,
          chainId: SOURCE_CHAIN_ID_MOCK,
          hash: SEND_HASH,
          type: TransactionType.relayDeposit,
        },
      ],
    });

    // Falls back to transactionMeta.hash when no mUSD receive transaction exists
    expect(useMultichainBlockExplorerTxUrlMock).toHaveBeenCalledWith({
      chainId: Number(SOURCE_CHAIN_ID_MOCK),
      txHash: PARENT_TX_HASH,
    });
  });

  it('renders receive line without block explorer link when hash is 0x0', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        id: transactionIdMock,
        chainId: SOURCE_CHAIN_ID_MOCK,
        submittedTime: TRANSACTION_META_MOCK.submittedTime,
        type: TransactionType.musdConversion,
        requiredTransactionIds: [MUSD_SEND_TX_ID],
        hash: '0x0',
        metamaskPay: {
          chainId: SOURCE_CHAIN_ID_MOCK,
          tokenAddress: '0x123',
        },
      } as unknown as TransactionMeta,
    });

    render({
      transactions: [
        {
          id: MUSD_SEND_TX_ID,
          chainId: SOURCE_CHAIN_ID_MOCK,
          hash: SEND_HASH,
          type: TransactionType.relayDeposit,
        },
      ],
    });

    // No fallback when hash is 0x0
    expect(useMultichainBlockExplorerTxUrlMock).toHaveBeenCalledWith({
      chainId: Number(SOURCE_CHAIN_ID_MOCK),
      txHash: undefined,
    });
  });

  it('uses send transaction hash for sent line block explorer link', () => {
    render({
      transactions: [
        {
          id: MUSD_SEND_TX_ID,
          chainId: SOURCE_CHAIN_ID_MOCK,
          hash: SEND_HASH,
          type: TransactionType.relayDeposit,
        },
        {
          id: MUSD_RECEIVE_TX_ID,
          chainId: SOURCE_CHAIN_ID_MOCK,
          hash: MUSD_RECEIVE_HASH,
          transferInformation: {
            contractAddress: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
            decimals: 6,
            symbol: 'MUSD',
          },
        },
      ],
    });

    // Check block explorer URL is called with send hash
    expect(useMultichainBlockExplorerTxUrlMock).toHaveBeenCalledWith({
      chainId: Number(SOURCE_CHAIN_ID_MOCK),
      txHash: SEND_HASH,
    });
  });
});
