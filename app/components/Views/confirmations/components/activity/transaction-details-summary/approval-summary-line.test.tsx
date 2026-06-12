import React from 'react';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../../locales/i18n';
import { useMultichainBlockExplorerTxUrl } from '../../../../../UI/Bridge/hooks/useMultichainBlockExplorerTxUrl';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { selectBridgeHistoryForAccount } from '../../../../../../selectors/bridgeStatusController';
import { useBridgeTxHistoryData } from '../../../../../../util/bridge/hooks/useBridgeTxHistoryData';
import { useTokenAmount } from '../../../hooks/useTokenAmount';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { ApprovalSummaryLine } from './approval-summary-line';

jest.mock('../../../../../UI/Bridge/hooks/useMultichainBlockExplorerTxUrl');
jest.mock('../../../hooks/tokens/useTokenWithBalance');
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

function render() {
  return renderWithProvider(
    <ApprovalSummaryLine
      transactionMeta={
        {
          id: 'approval-id',
          chainId: '0x1',
          hash: '0x456',
          submittedTime: 1755719285723,
          type: TransactionType.tokenMethodApprove,
          txParams: { from: '0x123', to: '0x999' },
        } as unknown as TransactionMeta
      }
    />,
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

describe('ApprovalSummaryLine', () => {
  const useMultichainBlockExplorerTxUrlMock = jest.mocked(
    useMultichainBlockExplorerTxUrl,
  );
  const useTokenWithBalanceMock = jest.mocked(useTokenWithBalance);

  beforeEach(() => {
    jest.resetAllMocks();

    useMultichainBlockExplorerTxUrlMock.mockReturnValue({
      explorerTxUrl: 'https://explorer.example',
      explorerName: 'Explorer',
    } as ReturnType<typeof useMultichainBlockExplorerTxUrl>);

    useTokenWithBalanceMock.mockReturnValue({ symbol: 'USDC' } as ReturnType<
      typeof useTokenWithBalance
    >);

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

  it('renders approval title', () => {
    const { getByText } = render();

    expect(
      getByText(
        strings('transaction_details.summary_title.bridge_approval', {
          approveSymbol: 'USDC',
        }),
      ),
    ).toBeDefined();
  });

  it('uses txParams.to for token lookup', () => {
    render();

    expect(useTokenWithBalanceMock).toHaveBeenCalledWith('0x999', '0x1');
  });

  it('renders loading title when token symbol is unavailable', () => {
    useTokenWithBalanceMock.mockReturnValue(
      {} as ReturnType<typeof useTokenWithBalance>,
    );

    const { getByText } = render();

    expect(
      getByText(
        strings('transaction_details.summary_title.bridge_approval_loading'),
      ),
    ).toBeDefined();
  });
});
