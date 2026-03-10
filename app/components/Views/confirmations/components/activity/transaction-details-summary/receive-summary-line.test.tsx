import React from 'react';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../../locales/i18n';
import { useMultichainBlockExplorerTxUrl } from '../../../../../UI/Bridge/hooks/useMultichainBlockExplorerTxUrl';
import { useNetworkName } from '../../../hooks/useNetworkName';
import { POLYGON_USDCE } from '../../../constants/predict';
import { selectBridgeHistoryForAccount } from '../../../../../../selectors/bridgeStatusController';
import { useBridgeTxHistoryData } from '../../../../../../util/bridge/hooks/useBridgeTxHistoryData';
import { useTokenAmount } from '../../../hooks/useTokenAmount';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { ReceiveSummaryLine } from './receive-summary-line';

jest.mock('../../../../../UI/Bridge/hooks/useMultichainBlockExplorerTxUrl');
jest.mock('../../../hooks/useNetworkName');
jest.mock('../../../../../../selectors/bridgeStatusController');
jest.mock('../../../../../../util/bridge/hooks/useBridgeTxHistoryData');
jest.mock('../../../hooks/useTokenAmount');
jest.mock('../../../hooks/activity/useTransactionDetails');

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

function render(transactionMeta: Partial<TransactionMeta>) {
  return renderWithProvider(
    <ReceiveSummaryLine transactionMeta={transactionMeta as TransactionMeta} />,
    {
      state: {
        engine: {
          backgroundState: {
            TransactionController: { transactions: [] },
          },
        },
      },
    },
  );
}

describe('ReceiveSummaryLine', () => {
  const useMultichainBlockExplorerTxUrlMock = jest.mocked(
    useMultichainBlockExplorerTxUrl,
  );
  const useNetworkNameMock = jest.mocked(useNetworkName);

  beforeEach(() => {
    jest.resetAllMocks();

    useMultichainBlockExplorerTxUrlMock.mockReturnValue({
      explorerTxUrl: 'https://explorer.example',
      explorerName: 'Explorer',
    } as ReturnType<typeof useMultichainBlockExplorerTxUrl>);

    useNetworkNameMock.mockReturnValue('Arbitrum');

    jest.mocked(selectBridgeHistoryForAccount).mockReturnValue({});
    jest.mocked(useBridgeTxHistoryData).mockReturnValue({
      bridgeTxHistoryItem: undefined,
      isBridgeComplete: null,
    });
    jest
      .mocked(useTokenAmount)
      .mockReturnValue({} as ReturnType<typeof useTokenAmount>);
    jest.mocked(useTransactionDetails).mockReturnValue({
      transactionMeta: {} as TransactionMeta,
    });
  });

  it('renders perps receive title', () => {
    const { getByText } = render({
      id: 'tx-id',
      chainId: '0x1' as Hex,
      hash: '0x123',
      submittedTime: 1755719285723,
      type: TransactionType.perpsDeposit,
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

  it('renders no block explorer button when mUSD conversion hash is 0x0', () => {
    useMultichainBlockExplorerTxUrlMock.mockReturnValue(undefined);

    const { queryByTestId } = render({
      id: 'tx-id',
      chainId: '0x1' as Hex,
      hash: '0x0',
      submittedTime: 1755719285723,
      type: TransactionType.musdConversion,
    });

    expect(queryByTestId('block-explorer-button')).toBeNull();
  });

  it('renders predict deposit receive title', () => {
    const { getByText } = render({
      id: 'tx-id',
      chainId: '0x1' as Hex,
      hash: '0x123',
      submittedTime: 1755719285723,
      type: TransactionType.predictDeposit,
    });

    expect(
      getByText(
        strings('transaction_details.summary_title.bridge_receive', {
          targetSymbol: POLYGON_USDCE.symbol,
          targetChain: 'Arbitrum',
        }),
      ),
    ).toBeDefined();
  });

  it('renders mUSD conversion receive title', () => {
    const { getByText } = render({
      id: 'tx-id',
      chainId: '0x1' as Hex,
      hash: '0x123',
      submittedTime: 1755719285723,
      type: TransactionType.musdConversion,
    });

    expect(
      getByText(
        strings('transaction_details.summary_title.bridge_receive', {
          targetSymbol: 'mUSD',
          targetChain: 'Arbitrum',
        }),
      ),
    ).toBeDefined();
  });

  it('renders loading title when network name is unavailable', () => {
    useNetworkNameMock.mockReturnValue(undefined);

    const { getByText } = render({
      id: 'tx-id',
      chainId: '0x1' as Hex,
      hash: '0x123',
      submittedTime: 1755719285723,
      type: TransactionType.musdConversion,
    });

    expect(
      getByText(
        strings('transaction_details.summary_title.bridge_receive_loading'),
      ),
    ).toBeDefined();
  });
});
