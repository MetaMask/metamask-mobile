import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PostTradeBottomSheet } from './index';
import Routes from '../../../../../constants/navigation/Routes';

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockResetState = jest.fn();
const mockUpdateQuoteParams = jest.fn();

jest.mock('react-redux', () => ({ useDispatch: () => mockDispatch }));
jest.mock('../../hooks/useBridgeQuoteRequest', () => ({
  useBridgeQuoteRequest: () => mockUpdateQuoteParams,
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: mockNavigate }),
}));
jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: { BridgeController: { resetState: () => mockResetState() } },
  },
}));
jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => ({
    status: 'failed',
    sourceAmount: '1.23456',
    destAmount: '2.34567',
    sourceToken: { symbol: 'ETH', chainId: '0x1' },
    destToken: { symbol: 'USDC', chainId: '0x1' },
  }),
}));
jest.mock('./usePostTradeTxStatus', () => ({
  usePostTradeTxStatus: () => 'failed',
}));

beforeEach(jest.clearAllMocks);

describe('PostTradeBottomSheet', () => {
  it('runs failed-state actions', () => {
    const { getByTestId } = render(React.createElement(PostTradeBottomSheet));

    fireEvent.press(getByTestId('post-trade-bottom-sheet-try-again-button'));
    fireEvent.press(
      getByTestId('post-trade-bottom-sheet-view-activity-button'),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    expect(mockResetState).toHaveBeenCalled();
    expect(mockUpdateQuoteParams).toHaveBeenCalled();
    expect(mockDispatch.mock.calls[3][0].payload).toBe('1.23456');
  });
});
