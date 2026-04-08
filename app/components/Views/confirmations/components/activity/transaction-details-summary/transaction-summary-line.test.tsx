import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import Routes from '../../../../../../constants/navigation/Routes';
import { useMultichainBlockExplorerTxUrl } from '../../../../../UI/Bridge/hooks/useMultichainBlockExplorerTxUrl';
import { TransactionSummaryLine } from './transaction-summary-line';

const mockNavigate = jest.fn();

jest.mock('../../../../../UI/Bridge/hooks/useMultichainBlockExplorerTxUrl');

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

function render() {
  const time = 1755719285723;

  return {
    ...renderWithProvider(
      <TransactionSummaryLine
        title="Test title"
        transactionMeta={
          {
            id: 'tx-id',
            chainId: '0x1' as Hex,
            hash: '0x123' as Hex,
            status: TransactionStatus.confirmed,
            submittedTime: time,
          } as TransactionMeta
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
    ),
    time,
  };
}

describe('TransactionSummaryLine', () => {
  const useMultichainBlockExplorerTxUrlMock = jest.mocked(
    useMultichainBlockExplorerTxUrl,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useMultichainBlockExplorerTxUrlMock.mockReturnValue({
      explorerTxUrl: 'https://explorer.example',
      explorerName: 'Explorer',
    } as ReturnType<typeof useMultichainBlockExplorerTxUrl>);
  });

  it('renders title and date subtitle', () => {
    const { getByLabelText, getByTestId } = render();

    expect(getByLabelText('Test title')).toBeDefined();
    expect(getByTestId('progress-list-item-subtitle')).toBeDefined();
  });

  it('renders block explorer button when URL is available', () => {
    const { getByTestId } = render();

    expect(getByTestId('block-explorer-button')).toBeDefined();
  });

  it('does not render block explorer button when URL is unavailable', () => {
    useMultichainBlockExplorerTxUrlMock.mockReturnValue(undefined);

    const { queryByTestId } = render();

    expect(queryByTestId('block-explorer-button')).toBeNull();
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
