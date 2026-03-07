import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../../locales/i18n';
import { useMultichainBlockExplorerTxUrl } from '../../../../../UI/Bridge/hooks/useMultichainBlockExplorerTxUrl';
import Routes from '../../../../../../constants/navigation/Routes';
import { useNetworkName } from '../../../hooks/useNetworkName';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { selectBridgeHistoryForAccount } from '../../../../../../selectors/bridgeStatusController';
import { useBridgeTxHistoryData } from '../../../../../../util/bridge/hooks/useBridgeTxHistoryData';
import { useTokenAmount } from '../../../hooks/useTokenAmount';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { RelayDepositSummaryLine } from './relay-deposit-summary-line';

const mockNavigate = jest.fn();

jest.mock('../../../../../UI/Bridge/hooks/useMultichainBlockExplorerTxUrl');
jest.mock('../../../hooks/useNetworkName');
jest.mock('../../../hooks/tokens/useTokenWithBalance');
jest.mock('../../../../../../selectors/bridgeStatusController');
jest.mock('../../../../../../util/bridge/hooks/useBridgeTxHistoryData');
jest.mock('../../../hooks/useTokenAmount');
jest.mock('../../../hooks/activity/useTransactionDetails');

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

function render(parentType: TransactionType = TransactionType.perpsDeposit) {
  return renderWithProvider(
    <RelayDepositSummaryLine
      transactionMeta={
        {
          id: 'relay-id',
          chainId: '0x1',
          hash: '0x456',
          submittedTime: 1755719285723,
          type: TransactionType.relayDeposit,
        } as unknown as TransactionMeta
      }
      parentTransaction={
        {
          id: 'parent-id',
          chainId: '0x1',
          type: parentType,
        } as unknown as TransactionMeta
      }
      payTokenInfo={{
        tokenAddress: '0x123' as Hex,
        chainId: '0x1' as Hex,
      }}
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

describe('RelayDepositSummaryLine', () => {
  const useMultichainBlockExplorerTxUrlMock = jest.mocked(
    useMultichainBlockExplorerTxUrl,
  );
  const useNetworkNameMock = jest.mocked(useNetworkName);
  const useTokenWithBalanceMock = jest.mocked(useTokenWithBalance);

  beforeEach(() => {
    jest.resetAllMocks();

    useMultichainBlockExplorerTxUrlMock.mockReturnValue({
      explorerTxUrl: 'https://explorer.example',
      explorerName: 'Explorer',
    } as ReturnType<typeof useMultichainBlockExplorerTxUrl>);

    useNetworkNameMock.mockReturnValue('Ethereum');
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

  it('renders bridge send title', () => {
    const { getByText } = render();

    expect(
      getByText(
        strings('transaction_details.summary_title.bridge_send', {
          sourceSymbol: 'USDC',
          sourceChain: 'Ethereum',
        }),
      ),
    ).toBeDefined();
  });

  it('renders mUSD conversion send title for musd parent transaction', () => {
    const { getByText } = render(TransactionType.musdConversion);

    expect(
      getByText(
        strings('transaction_details.summary_title.musd_convert_send', {
          sourceSymbol: 'USDC',
          sourceChain: 'Ethereum',
        }),
      ),
    ).toBeDefined();
  });

  it('navigates to block explorer when button is pressed', () => {
    const { getByTestId } = render();

    fireEvent.press(getByTestId('block-explorer-button'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: 'https://explorer.example',
        title: 'Explorer',
      },
    });
  });
});
