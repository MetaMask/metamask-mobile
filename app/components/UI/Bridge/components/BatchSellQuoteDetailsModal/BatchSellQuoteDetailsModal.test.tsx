import React from 'react';
import { fireEvent, render, within } from '@testing-library/react-native';

import Routes from '../../../../../constants/navigation/Routes';
import {
  BatchSellQuoteDetails,
  BatchSellQuoteDetailsModal,
  TotalReceivedSummaryRow,
} from './index';
import { BatchSellQuoteDetailsModalSelectorsIDs } from './BatchSellQuoteDetailsModal.testIds';
import { BatchSellQuoteDetailsProps } from './BatchSellQuoteDetailsModal.types';

const mockGoBack = jest.fn();
const mockReplace = jest.fn();
const ethAssetId = 'eip155:1/erc20:0x1111111111111111111111111111111111111111';
const uniAssetId = 'eip155:1/erc20:0x2222222222222222222222222222222222222222';
const linkAssetId = 'eip155:1/erc20:0x3333333333333333333333333333333333333333';
const linkSourceToken = {
  address: '0x3333333333333333333333333333333333333333',
  chainId: '0x1',
  decimals: 18,
  symbol: 'LINK',
};
const defaultSourceTokens = [
  {
    address: '0x1111111111111111111111111111111111111111',
    chainId: '0x1',
    decimals: 18,
    symbol: 'ETH',
  },
  {
    address: '0x2222222222222222222222222222222222222222',
    chainId: '0x1',
    decimals: 18,
    symbol: 'UNI',
  },
];

interface MockQuoteTokenData {
  key: string;
  tokenSymbol: string;
  slippage: string;
  receivedAmount: string;
  receivedAmountFiat: string;
  isLoading: boolean;
  isHighPriceImpact: boolean;
  isQuoteUnavailable: boolean;
}

interface MockBatchSellQuoteData {
  tokenData: Record<string, MockQuoteTokenData>;
  totalReceived: { formatted: string };
  minimumReceived: { formatted: string };
  isSummaryLoading: boolean;
}

const defaultQuoteData: MockBatchSellQuoteData = {
  tokenData: {
    [ethAssetId]: {
      key: 'eth',
      tokenSymbol: 'ETH',
      slippage: '0.5%',
      receivedAmount: '3,456.78 USDC',
      receivedAmountFiat: '$3,456.78',
      isLoading: false,
      isHighPriceImpact: false,
      isQuoteUnavailable: false,
    },
    [uniAssetId]: {
      key: 'uni',
      tokenSymbol: 'UNI',
      slippage: '0.5%',
      receivedAmount: '500 USDC',
      receivedAmountFiat: '$500.00',
      isLoading: false,
      isHighPriceImpact: false,
      isQuoteUnavailable: false,
    },
  },
  totalReceived: { formatted: '7,638.23 USDC' },
  minimumReceived: { formatted: '7,485.47 USDC' },
  isSummaryLoading: false,
};
let mockSelectedTokens = defaultSourceTokens;
let mockBatchSellQuoteData = defaultQuoteData;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    replace: mockReplace,
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  selectBatchSellSourceTokens: jest.fn(() => mockSelectedTokens),
}));

jest.mock('../../hooks/useBatchSellQuoteData', () => ({
  getBatchSellOrderedQuoteTokenData: jest.fn(
    (
      sourceTokens: typeof defaultSourceTokens,
      tokenData: Record<string, MockQuoteTokenData>,
    ) =>
      sourceTokens
        .map((token) => tokenData[`eip155:1/erc20:${token.address}`])
        .filter(Boolean),
  ),
  useBatchSellQuoteData: jest.fn(() => mockBatchSellQuoteData),
}));

const defaultDetailsProps: BatchSellQuoteDetailsProps = {
  tokenData: [
    {
      key: 'eth',
      tokenSymbol: 'ETH',
      slippage: '0.5%',
      receivedAmount: '3,456.78 USDC',
    },
    {
      key: 'uni',
      tokenSymbol: 'UNI',
      slippage: '0.5%',
      receivedAmount: '500 USDC',
    },
  ],
  totalReceived: { formatted: '7,638.23 USDC' },
  minimumReceived: { formatted: '7,485.47 USDC' },
};

function renderModal(overrides: Partial<typeof defaultQuoteData> = {}) {
  mockBatchSellQuoteData = {
    ...defaultQuoteData,
    ...overrides,
  };

  return render(<BatchSellQuoteDetailsModal />);
}

const defaultSummaryRowProps = {
  totalReceived: { formatted: '7,638.23 USDC' },
  minimumReceived: { formatted: '7,485.47 USDC' },
};

describe('TotalReceivedSummaryRow', () => {
  it('renders formatted values when isLoading is omitted', () => {
    const { getByText, queryByTestId } = render(
      <TotalReceivedSummaryRow {...defaultSummaryRowProps} />,
    );

    expect(getByText('Total received')).toBeOnTheScreen();
    expect(getByText('7,638.23 USDC')).toBeOnTheScreen();
    expect(getByText('Min. received:')).toBeOnTheScreen();
    expect(getByText('7,485.47 USDC')).toBeOnTheScreen();
    expect(
      queryByTestId(
        BatchSellQuoteDetailsModalSelectorsIDs.TOTAL_RECEIVED_SKELETON,
      ),
    ).toBeNull();
    expect(
      queryByTestId(
        BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_SKELETON,
      ),
    ).toBeNull();
  });

  it('renders summary skeletons when isLoading is true', () => {
    const { getByTestId, getByText, queryByText } = render(
      <TotalReceivedSummaryRow {...defaultSummaryRowProps} isLoading />,
    );

    expect(getByText('Total received')).toBeOnTheScreen();
    expect(getByText('Min. received:')).toBeOnTheScreen();
    expect(
      getByTestId(
        BatchSellQuoteDetailsModalSelectorsIDs.TOTAL_RECEIVED_SKELETON,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_SKELETON,
      ),
    ).toBeOnTheScreen();
    expect(queryByText('7,638.23 USDC')).toBeNull();
    expect(queryByText('7,485.47 USDC')).toBeNull();
  });
});

describe('BatchSellQuoteDetailsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedTokens = defaultSourceTokens;
    mockBatchSellQuoteData = defaultQuoteData;
  });

  it('renders the sheet header and quote rows from live quote data', () => {
    const { getAllByText, getByTestId, getByText } = renderModal();

    expect(
      getByTestId(BatchSellQuoteDetailsModalSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
    expect(getAllByText('Total received')).toHaveLength(2);
    expect(
      getByTestId(`${BatchSellQuoteDetailsModalSelectorsIDs.QUOTE_ROW}-eth`),
    ).toBeOnTheScreen();
    expect(getByText('ETH • 0.5% slippage')).toBeOnTheScreen();
    expect(getByText('3,456.78 USDC')).toBeOnTheScreen();
    expect(
      getByTestId(`${BatchSellQuoteDetailsModalSelectorsIDs.QUOTE_ROW}-uni`),
    ).toBeOnTheScreen();
    expect(getByText('UNI • 0.5% slippage')).toBeOnTheScreen();
    expect(getByText('500 USDC')).toBeOnTheScreen();
  });

  it('closes with navigation when the close button is pressed', () => {
    const { getByTestId } = renderModal();

    fireEvent.press(
      getByTestId(BatchSellQuoteDetailsModalSelectorsIDs.CLOSE_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders total and minimum received values from props', () => {
    const { getByTestId, getByText } = renderModal();

    expect(
      getByTestId(BatchSellQuoteDetailsModalSelectorsIDs.TOTAL_RECEIVED_ROW),
    ).toBeOnTheScreen();
    expect(getByText('7,638.23 USDC')).toBeOnTheScreen();
    expect(
      getByTestId(BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_ROW),
    ).toBeOnTheScreen();
    expect(getByText('Min. received:')).toBeOnTheScreen();
    expect(getByText('7,485.47 USDC')).toBeOnTheScreen();
  });

  it('renders summary skeletons while loading', () => {
    const { getByTestId, getByText, queryByTestId, queryByText } = renderModal({
      isSummaryLoading: true,
    });

    expect(getByText('ETH • 0.5% slippage')).toBeOnTheScreen();
    expect(getByText('UNI • 0.5% slippage')).toBeOnTheScreen();
    expect(
      queryByTestId(
        `${BatchSellQuoteDetailsModalSelectorsIDs.QUOTE_ROW_RECEIVED_AMOUNT_SKELETON}-eth`,
      ),
    ).toBeNull();
    expect(
      queryByTestId(
        `${BatchSellQuoteDetailsModalSelectorsIDs.QUOTE_ROW_RECEIVED_AMOUNT_SKELETON}-uni`,
      ),
    ).toBeNull();
    expect(
      getByTestId(
        BatchSellQuoteDetailsModalSelectorsIDs.TOTAL_RECEIVED_SKELETON,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_SKELETON,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_INFO_BUTTON,
      ),
    ).toBeOnTheScreen();
    expect(queryByText('3,456.78 USDC')).toBeOnTheScreen();
    expect(queryByText('7,638.23 USDC')).toBeNull();
    expect(queryByText('7,485.47 USDC')).toBeNull();
  });

  it('renders row-level loading and unavailable states', () => {
    mockSelectedTokens = [...defaultSourceTokens, linkSourceToken];
    const { getAllByText, getByTestId, getByText, queryByTestId } = renderModal(
      {
        tokenData: {
          ...defaultQuoteData.tokenData,
          [uniAssetId]: {
            ...defaultQuoteData.tokenData[uniAssetId],
            isLoading: true,
          },
          [linkAssetId]: {
            key: 'link',
            tokenSymbol: 'LINK',
            slippage: '0.5%',
            receivedAmount: '-- USDC',
            receivedAmountFiat: '-',
            isLoading: false,
            isHighPriceImpact: false,
            isQuoteUnavailable: true,
          },
        },
        totalReceived: { formatted: '3,456.78 USDC' },
        minimumReceived: { formatted: '3,456.78 USDC' },
        isSummaryLoading: false,
      },
    );

    expect(getAllByText('3,456.78 USDC').length).toBeGreaterThan(0);
    expect(
      queryByTestId(
        `${BatchSellQuoteDetailsModalSelectorsIDs.QUOTE_ROW_RECEIVED_AMOUNT_SKELETON}-eth`,
      ),
    ).toBeNull();
    expect(
      getByTestId(
        `${BatchSellQuoteDetailsModalSelectorsIDs.QUOTE_ROW_RECEIVED_AMOUNT_SKELETON}-uni`,
      ),
    ).toBeOnTheScreen();
    expect(getByText('UNI • 0.5% slippage')).toBeOnTheScreen();
    expect(getByText('No quote available')).toBeOnTheScreen();
  });

  it('updates quote rows from live quote data while mounted', () => {
    const { getByTestId, getByText, queryByTestId, rerender } = renderModal({
      tokenData: {
        [ethAssetId]: {
          ...defaultQuoteData.tokenData[ethAssetId],
          isLoading: true,
        },
        [uniAssetId]: {
          ...defaultQuoteData.tokenData[uniAssetId],
          isLoading: true,
        },
      },
      totalReceived: { formatted: '-- USDC' },
      minimumReceived: { formatted: '-- USDC' },
      isSummaryLoading: true,
    });

    expect(
      getByTestId(
        `${BatchSellQuoteDetailsModalSelectorsIDs.QUOTE_ROW_RECEIVED_AMOUNT_SKELETON}-eth`,
      ),
    ).toBeOnTheScreen();

    mockBatchSellQuoteData = defaultQuoteData;

    rerender(<BatchSellQuoteDetailsModal />);

    expect(getByText('3,456.78 USDC')).toBeOnTheScreen();
    expect(
      queryByTestId(
        `${BatchSellQuoteDetailsModalSelectorsIDs.QUOTE_ROW_RECEIVED_AMOUNT_SKELETON}-eth`,
      ),
    ).toBeNull();
  });

  it('renders min received beneath total received with info icon on total row', () => {
    const onMinimumReceivedInfoPress = jest.fn();
    const { getByTestId } = render(
      <BatchSellQuoteDetails
        {...defaultDetailsProps}
        onMinimumReceivedInfoPress={onMinimumReceivedInfoPress}
      />,
    );

    const totalRow = getByTestId(
      BatchSellQuoteDetailsModalSelectorsIDs.TOTAL_RECEIVED_ROW,
    );
    const minRow = getByTestId(
      BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_ROW,
    );

    expect(
      within(totalRow).getByTestId(
        BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_INFO_BUTTON,
      ),
    ).toBeOnTheScreen();
    expect(
      within(minRow).queryByTestId(
        BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_INFO_BUTTON,
      ),
    ).toBeNull();
  });

  it('renders a non-pressable info icon when onMinimumReceivedInfoPress is omitted', () => {
    const { queryByTestId } = render(
      <BatchSellQuoteDetails {...defaultDetailsProps} />,
    );

    expect(
      queryByTestId(
        BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_INFO_BUTTON,
      ),
    ).toBeNull();
  });

  it('falls back to tokenSymbol for row testIDs when key is missing', () => {
    const { getByTestId } = render(
      <BatchSellQuoteDetails
        {...defaultDetailsProps}
        tokenData={[
          {
            tokenSymbol: 'ETH',
            slippage: '0.5%',
            receivedAmount: '100 USDC',
          },
        ]}
      />,
    );

    expect(
      getByTestId(`${BatchSellQuoteDetailsModalSelectorsIDs.QUOTE_ROW}-ETH`),
    ).toBeOnTheScreen();
  });

  it('renders summary values when isLoading is omitted', () => {
    const { getByText, queryByTestId } = render(
      <BatchSellQuoteDetails
        tokenData={defaultDetailsProps.tokenData}
        totalReceived={defaultDetailsProps.totalReceived}
        minimumReceived={defaultDetailsProps.minimumReceived}
      />,
    );

    expect(getByText('7,638.23 USDC')).toBeOnTheScreen();
    expect(getByText('7,485.47 USDC')).toBeOnTheScreen();
    expect(
      queryByTestId(
        BatchSellQuoteDetailsModalSelectorsIDs.TOTAL_RECEIVED_SKELETON,
      ),
    ).toBeNull();
    expect(
      queryByTestId(
        BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_SKELETON,
      ),
    ).toBeNull();
  });

  it('renders summary skeletons when isLoading is true', () => {
    const { getByTestId, queryByText } = render(
      <BatchSellQuoteDetails {...defaultDetailsProps} isLoading />,
    );

    expect(
      getByTestId(
        BatchSellQuoteDetailsModalSelectorsIDs.TOTAL_RECEIVED_SKELETON,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_SKELETON,
      ),
    ).toBeOnTheScreen();
    expect(queryByText('7,638.23 USDC')).toBeNull();
    expect(queryByText('7,485.47 USDC')).toBeNull();
  });

  it('shows row skeleton instead of unavailable text when both loading and quote unavailable', () => {
    const { getByTestId, queryByText } = render(
      <BatchSellQuoteDetails
        {...defaultDetailsProps}
        tokenData={[
          {
            key: 'eth',
            tokenSymbol: 'ETH',
            slippage: '0.5%',
            receivedAmount: '-- USDC',
            isLoading: true,
            isQuoteUnavailable: true,
          },
        ]}
      />,
    );

    expect(
      getByTestId(
        `${BatchSellQuoteDetailsModalSelectorsIDs.QUOTE_ROW_RECEIVED_AMOUNT_SKELETON}-eth`,
      ),
    ).toBeOnTheScreen();
    expect(queryByText('No quote available')).toBeNull();
  });

  it('hides quote rows when token details are collapsed', () => {
    const props: BatchSellQuoteDetailsProps = {
      ...defaultDetailsProps,
      isTokenDetailsExpanded: false,
    };
    const { getByText, queryByText } = render(
      <BatchSellQuoteDetails {...props} />,
    );

    expect(queryByText('ETH • 0.5% slippage')).toBeNull();
    expect(queryByText('UNI • 0.5% slippage')).toBeNull();
    expect(getByText('Total received')).toBeOnTheScreen();
    expect(getByText('7,638.23 USDC')).toBeOnTheScreen();
    expect(getByText('Min. received:')).toBeOnTheScreen();
    expect(getByText('7,485.47 USDC')).toBeOnTheScreen();
  });

  it('hides quote rows but renders summary skeletons when collapsed and loading', () => {
    const { getByTestId, queryByText } = render(
      <BatchSellQuoteDetails
        {...defaultDetailsProps}
        isTokenDetailsExpanded={false}
        isLoading
      />,
    );

    expect(queryByText('ETH • 0.5% slippage')).toBeNull();
    expect(queryByText('UNI • 0.5% slippage')).toBeNull();
    expect(
      getByTestId(
        BatchSellQuoteDetailsModalSelectorsIDs.TOTAL_RECEIVED_SKELETON,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_SKELETON,
      ),
    ).toBeOnTheScreen();
    expect(queryByText('7,638.23 USDC')).toBeNull();
    expect(queryByText('7,485.47 USDC')).toBeNull();
  });

  it('calls onMinimumReceivedInfoPress when the info button is pressed', () => {
    const onMinimumReceivedInfoPress = jest.fn();
    const props: BatchSellQuoteDetailsProps = {
      ...defaultDetailsProps,
      onMinimumReceivedInfoPress,
    };
    const { getByTestId } = render(<BatchSellQuoteDetails {...props} />);

    fireEvent.press(
      getByTestId(
        BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_INFO_BUTTON,
      ),
    );

    expect(onMinimumReceivedInfoPress).toHaveBeenCalledTimes(1);
  });

  it('switches to the minimum received info modal when the info button is pressed', () => {
    const { getByTestId } = renderModal();

    fireEvent.press(
      getByTestId(
        BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_INFO_BUTTON,
      ),
    );

    expect(mockReplace).toHaveBeenCalledWith(
      Routes.BRIDGE.MODALS.BATCH_SELL_MINIMUM_RECEIVED_INFO_MODAL,
      {
        sourceModal: {
          screen: Routes.BRIDGE.MODALS.BATCH_SELL_QUOTE_DETAILS_MODAL,
        },
      },
    );
  });
});
