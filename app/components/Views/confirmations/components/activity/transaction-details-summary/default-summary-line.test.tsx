import React from 'react';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../../locales/i18n';
import { useMultichainBlockExplorerTxUrl } from '../../../../../UI/Bridge/hooks/useMultichainBlockExplorerTxUrl';
import { selectBridgeHistoryForAccount } from '../../../../../../selectors/bridgeStatusController';
import { useBridgeTxHistoryData } from '../../../../../../util/bridge/hooks/useBridgeTxHistoryData';
import { useTokenAmount } from '../../../hooks/useTokenAmount';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { DefaultSummaryLine } from './default-summary-line';

jest.mock('../../../../../UI/Bridge/hooks/useMultichainBlockExplorerTxUrl');
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

function render(type: TransactionType) {
  return renderWithProvider(
    <DefaultSummaryLine
      transactionMeta={
        {
          id: 'tx-id',
          chainId: '0x1' as Hex,
          hash: '0x123',
          submittedTime: 1755719285723,
          type,
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

describe('DefaultSummaryLine', () => {
  const useMultichainBlockExplorerTxUrlMock = jest.mocked(
    useMultichainBlockExplorerTxUrl,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useMultichainBlockExplorerTxUrlMock.mockReturnValue({
      explorerTxUrl: 'https://explorer.example',
      explorerName: 'Explorer',
    } as ReturnType<typeof useMultichainBlockExplorerTxUrl>);

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

  it('renders swap title', () => {
    const { getByText } = render(TransactionType.swap);

    expect(
      getByText(strings('transaction_details.summary_title.swap')),
    ).toBeDefined();
  });

  it('renders default title for contract interaction', () => {
    const { getByText } = render(TransactionType.contractInteraction);

    expect(
      getByText(strings('transaction_details.summary_title.default')),
    ).toBeDefined();
  });

  it('renders swap approval title', () => {
    const { getByText } = render(TransactionType.swapApproval);

    expect(
      getByText(strings('transaction_details.summary_title.swap_approval')),
    ).toBeDefined();
  });
});
