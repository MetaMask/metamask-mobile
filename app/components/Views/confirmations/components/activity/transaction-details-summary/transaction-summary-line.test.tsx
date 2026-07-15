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
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { configureUseAnalyticsExternalLinkMock } from '../../../../../../util/test/analyticsMock';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../../../../util/analytics/AnalyticsEventBuilder';

const mockNavigate = jest.fn();
const trackEventMock = jest.fn();

jest.mock('../../../../../UI/Bridge/hooks/useMultichainBlockExplorerTxUrl');

jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));

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

    configureUseAnalyticsExternalLinkMock(trackEventMock);

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

    expect(trackEventMock).toHaveBeenCalledWith(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.EXTERNAL_LINK_CLICKED,
      )
        .addProperties({
          location: 'transaction_details_summary',
          text: 'Explorer',
          url_domain: 'explorer.example',
        })
        .build(),
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: 'https://explorer.example',
        title: 'Explorer',
      },
    });
  });
});
