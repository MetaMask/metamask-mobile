import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { BridgeToken } from '../../types';
import { PostTradeBottomSheet } from './index';
import { PostTradeStatus } from './PostTradeBottomSheet.types';
import { PostTradeBottomSheetTestIds } from './PostTradeBottomSheet.testIds';
import Routes from '../../../../../constants/navigation/Routes';

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());
const mockResetState = jest.fn();
let mockStatus = PostTradeStatus.InProgress;
let mockParams = {};

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: { resetState: () => mockResetState() },
    },
  },
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => mockParams,
}));

jest.mock('./usePostTradeTxStatus', () => ({
  usePostTradeTxStatus: () => mockStatus,
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    return {
      __esModule: true,
      default: ReactActual.forwardRef(
        (
          { children, testID }: { children: React.ReactNode; testID: string },
          ref,
        ) => {
          ReactActual.useImperativeHandle(ref, () => ({
            onCloseBottomSheet: mockOnCloseBottomSheet,
          }));
          return ReactActual.createElement(View, { testID }, children);
        },
      ),
    };
  },
);

const sourceToken = { symbol: 'ETH' } as BridgeToken;
const destToken = { symbol: 'USDC' } as BridgeToken;
const defaultParams = {
  status: PostTradeStatus.InProgress,
  sourceAmount: '1.23456',
  destAmount: '2.34567',
  sourceToken: { ...sourceToken, chainId: '0x1' } as BridgeToken,
  destToken: { ...destToken, chainId: '0x1' } as BridgeToken,
};

const renderBottomSheet = () =>
  render(React.createElement(PostTradeBottomSheet));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = defaultParams;
  mockStatus = PostTradeStatus.InProgress;
});

describe('PostTradeBottomSheet', () => {
  it('runs close, view activity, and try again actions', () => {
    mockStatus = PostTradeStatus.Failed;
    const { getByTestId } = renderBottomSheet();

    fireEvent.press(getByTestId(PostTradeBottomSheetTestIds.CLOSE_BUTTON));
    fireEvent.press(
      getByTestId(PostTradeBottomSheetTestIds.VIEW_ACTIVITY_BUTTON),
    );
    fireEvent.press(getByTestId(PostTradeBottomSheetTestIds.TRY_AGAIN_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    expect(mockResetState).toHaveBeenCalled();
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(3);
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'bridge/setSourceToken' }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'bridge/setDestToken' }),
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'bridge/setIsDestTokenManuallySet',
      payload: true,
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'bridge/setSourceAmount',
      payload: defaultParams.sourceAmount,
    });
  });
});
