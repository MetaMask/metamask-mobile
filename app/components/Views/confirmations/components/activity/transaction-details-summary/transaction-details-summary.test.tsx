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

const mockNavigate = jest.fn();

jest.mock('../../../hooks/activity/useTransactionDetails');
jest.mock('../../../../../../util/bridge/hooks/useBridgeTxHistoryData');
jest.mock('../../../../../UI/Bridge/hooks/useMultichainBlockExplorerTxUrl');

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

const TRANSACTION_META_MOCK = {
  id: transactionIdMock,
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
  const useMultichainBlockExplorerTxUrlMock = jest.mocked(
    useMultichainBlockExplorerTxUrl,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        id: transactionIdMock,
      } as unknown as TransactionMeta,
    });

    useBridgeTxHistoryDataMock.mockReturnValue({
      bridgeTxHistoryItem: {
        quote: {
          srcAsset: {
            symbol: SYMBOL_MOCK,
          },
          destAsset: {
            symbol: SYMBOL_2_MOCK,
          },
        },
      },
    } as unknown as ReturnType<typeof useBridgeTxHistoryData>);

    useMultichainBlockExplorerTxUrlMock.mockReturnValue({
      explorerTxUrl: BLOCK_EXPLORER_URL_MOCK,
      explorerName: BLOCK_EXPLORER_TITLE_MOCK,
    } as ReturnType<typeof useMultichainBlockExplorerTxUrl>);
  });

  it('renders perps deposit line title', () => {
    const { getByText } = render({
      transactions: [
        { ...TRANSACTION_META_MOCK, type: TransactionType.perpsDeposit },
      ],
    });

    expect(
      getByText(strings('transaction_details.summary_title.perps_deposit')),
    ).toBeDefined();
  });

  it('renders bridge line title', () => {
    const { getByText } = render({
      transactions: [
        { ...TRANSACTION_META_MOCK, type: TransactionType.bridge },
      ],
    });

    expect(
      getByText(
        strings('transaction_details.summary_title.bridge', {
          sourceSymbol: SYMBOL_MOCK,
          targetSymbol: SYMBOL_2_MOCK,
        }),
      ),
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
          type: TransactionType.simpleSend,
        },
        {
          ...TRANSACTION_META_MOCK,
          id: REQUIRED_TRANSACTION_ID_MOCK,
          type: TransactionType.perpsDeposit,
        },
        {
          ...TRANSACTION_META_MOCK,
          id: REQUIRED_TRANSACTION_ID_2_MOCK,
          type: TransactionType.bridge,
        },
      ],
    });

    expect(
      getByText(strings('transaction_details.summary_title.perps_deposit')),
    ).toBeDefined();

    expect(
      getByText(
        strings('transaction_details.summary_title.bridge', {
          sourceSymbol: SYMBOL_MOCK,
          targetSymbol: SYMBOL_2_MOCK,
        }),
      ),
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
});
