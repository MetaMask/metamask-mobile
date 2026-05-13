import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import Routes from '../../../../../constants/navigation/Routes';
import { BatchSellQuoteDetails, BatchSellQuoteDetailsModal } from './index';
import { BatchSellQuoteDetailsModalSelectorsIDs } from './BatchSellQuoteDetailsModal.testIds';
import {
  BatchSellQuoteDetailsModalParams,
  BatchSellQuoteDetailsProps,
} from './BatchSellQuoteDetailsModal.types';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
let mockRouteParams: BatchSellQuoteDetailsModalParams;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => mockRouteParams,
}));

const defaultParams: BatchSellQuoteDetailsModalParams = {
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
  totalReceived: '7,638.23 USDC',
  minimumReceived: '7,485.47 USDC',
};

function renderModal(
  overrides: Partial<BatchSellQuoteDetailsModalParams> = {},
) {
  mockRouteParams = {
    ...defaultParams,
    ...overrides,
  };

  return render(<BatchSellQuoteDetailsModal />);
}

describe('BatchSellQuoteDetailsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = defaultParams;
  });

  it('renders the sheet header and quote rows from route params', () => {
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
    expect(getByText('Minimum received')).toBeOnTheScreen();
    expect(getByText('7,485.47 USDC')).toBeOnTheScreen();
  });

  it('calls onMinimumReceivedInfoPress when the info button is pressed', () => {
    const onMinimumReceivedInfoPress = jest.fn();
    const props: BatchSellQuoteDetailsProps = {
      ...defaultParams,
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

  it('opens the minimum received info modal when the info button is pressed', () => {
    const { getByTestId } = renderModal();

    fireEvent.press(
      getByTestId(
        BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_INFO_BUTTON,
      ),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.BATCH_SELL_MINIMUM_RECEIVED_INFO_MODAL,
    });
  });
});
