import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import Routes from '../../../../../constants/navigation/Routes';
import { BatchSellQuoteDetailsModalSelectorsIDs } from '../BatchSellQuoteDetailsModal/BatchSellQuoteDetailsModal.testIds';
import { BatchSellFinalReviewModal } from './index';
import { BatchSellFinalReviewModalSelectorsIDs } from './BatchSellFinalReviewModal.testIds';
import { BatchSellFinalReviewModalParams } from './BatchSellFinalReviewModal.types';

const mockGoBack = jest.fn();
const mockReplace = jest.fn();
let mockRouteParams: BatchSellFinalReviewModalParams;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    replace: mockReplace,
  }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => mockRouteParams,
}));

const defaultParams: BatchSellFinalReviewModalParams = {
  sourceTokens: [
    {
      key: 'eth',
      tokenSymbol: 'ETH',
      image: 'eth-image-url',
    },
    {
      key: 'uni',
      tokenSymbol: 'UNI',
    },
  ],
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
  totalReceived: '+7,638.23 USDC',
  minimumReceived: '+7,485.47 USDC',
  isLoading: false,
  networkFee: '1.20 USDC',
  networkFeeFiat: '$1.20',
  metamaskFeePercent: '0.875',
};

function renderModal(overrides: Partial<BatchSellFinalReviewModalParams> = {}) {
  mockRouteParams = {
    ...defaultParams,
    ...overrides,
  };

  return render(<BatchSellFinalReviewModal />);
}

describe('BatchSellFinalReviewModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = defaultParams;
  });

  it('renders the final review sheet content from route params', () => {
    const { getByTestId, getByText } = renderModal();

    expect(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
    expect(getByText('Review')).toBeOnTheScreen();
    expect(getByText('You sell')).toBeOnTheScreen();
    expect(getByText('2 tokens')).toBeOnTheScreen();
    expect(getByText('ETH • 0.5% slippage')).toBeOnTheScreen();
    expect(getByText('3,456.78 USDC')).toBeOnTheScreen();
    expect(getByText('Total received')).toBeOnTheScreen();
    expect(getByText('+7,638.23 USDC')).toBeOnTheScreen();
    expect(getByText('Minimum received')).toBeOnTheScreen();
    expect(getByText('+7,485.47 USDC')).toBeOnTheScreen();
    expect(getByText('Network fee')).toBeOnTheScreen();
    expect(getByText('1.20 USDC')).toBeOnTheScreen();
    expect(getByText('$1.20')).toBeOnTheScreen();
    expect(getByText('Sell all')).toBeOnTheScreen();
    expect(getByText('Includes 0.875% MetaMask fee')).toBeOnTheScreen();
  });

  it('closes with navigation when the close button is pressed', () => {
    const { getByTestId } = renderModal();

    fireEvent.press(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.CLOSE_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('collapses token rows while keeping received summary rows visible', () => {
    const { getByTestId, getByText, queryByText } = renderModal();

    fireEvent.press(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.YOU_SELL_TOGGLE_BUTTON),
    );

    expect(queryByText('ETH • 0.5% slippage')).toBeNull();
    expect(queryByText('UNI • 0.5% slippage')).toBeNull();
    expect(getByText('Total received')).toBeOnTheScreen();
    expect(getByText('+7,638.23 USDC')).toBeOnTheScreen();
    expect(getByText('Minimum received')).toBeOnTheScreen();
    expect(getByText('+7,485.47 USDC')).toBeOnTheScreen();
  });

  it('expands token rows after they are collapsed', () => {
    const { getByTestId, getByText } = renderModal();
    const toggleButton = getByTestId(
      BatchSellFinalReviewModalSelectorsIDs.YOU_SELL_TOGGLE_BUTTON,
    );

    fireEvent.press(toggleButton);
    fireEvent.press(toggleButton);

    expect(getByText('ETH • 0.5% slippage')).toBeOnTheScreen();
    expect(getByText('UNI • 0.5% slippage')).toBeOnTheScreen();
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
          screen: Routes.BRIDGE.MODALS.BATCH_SELL_FINAL_REVIEW_MODAL,
          params: defaultParams,
        },
      },
    );
  });

  it('switches to the network fee info modal when the info button is pressed', () => {
    const { getByTestId } = renderModal();

    fireEvent.press(
      getByTestId(
        BatchSellFinalReviewModalSelectorsIDs.NETWORK_FEE_INFO_BUTTON,
      ),
    );

    expect(mockReplace).toHaveBeenCalledWith(
      Routes.BRIDGE.MODALS.BATCH_SELL_NETWORK_FEE_INFO_MODAL,
      {
        sourceModal: {
          screen: Routes.BRIDGE.MODALS.BATCH_SELL_FINAL_REVIEW_MODAL,
          params: defaultParams,
        },
      },
    );
  });

  it('renders quote amount skeletons while loading', () => {
    const { getByTestId, getByText, queryByText } = renderModal({
      isLoading: true,
    });

    expect(getByText('ETH • 0.5% slippage')).toBeOnTheScreen();
    expect(
      getByTestId(
        `${BatchSellQuoteDetailsModalSelectorsIDs.QUOTE_ROW_RECEIVED_AMOUNT_SKELETON}-eth`,
      ),
    ).toBeOnTheScreen();
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
    expect(queryByText('3,456.78 USDC')).toBeNull();
    expect(queryByText('+7,638.23 USDC')).toBeNull();
  });
});
