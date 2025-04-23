import React from 'react';
import { render } from '@testing-library/react-native';
import BridgeStepList from './BridgeStepList';
import { TransactionMeta } from '@metamask/transaction-controller';
import {
  BridgeHistoryItem,
  StatusTypes,
  ActionTypes,
} from '@metamask/bridge-status-controller';
import { Step } from '@metamask/bridge-controller';

jest.mock('./StepProgressBarItem', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('./BridgeStepDescription', () => ({
  __esModule: true,
  default: jest.fn(() => null),
  getStepStatus: jest.fn(),
}));

describe('BridgeStepList', () => {
  const mockSteps = [
    {
      action: ActionTypes.BRIDGE,
      srcChainId: '0x1',
      destChainId: '0x89',
      srcAsset: 'ETH',
      destAsset: 'MATIC',
      srcAmount: '1',
      destAmount: '1',
      protocol: 'test',
    },
    {
      action: ActionTypes.SWAP,
      srcChainId: '0x1',
      destChainId: '0x89',
      srcAsset: 'ETH',
      destAsset: 'MATIC',
      srcAmount: '1',
      destAmount: '1',
      protocol: 'test',
    },
  ] as unknown as Step[];

  const mockBridgeHistoryItem = {
    id: '1',
    startTime: Date.now(),
    estimatedProcessingTimeInSeconds: 300,
    quote: {
      requestId: '1',
      srcChainId: '0x1',
      srcAsset: 'ETH',
      srcTokenAmount: '1',
      destChainId: '0x89',
      destAsset: 'MATIC',
      destTokenAmount: '1',
      steps: mockSteps,
      estimatedProcessingTimeInSeconds: 300,
      estimatedGasFee: '0.01',
      estimatedBridgeFee: '0.01',
    },
    status: StatusTypes.PENDING,
  } as unknown as BridgeHistoryItem;

  const mockSrcChainTxMeta = {
    id: '1',
    time: Date.now(),
    status: 'submitted',
  } as unknown as TransactionMeta;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <BridgeStepList
        bridgeHistoryItem={mockBridgeHistoryItem}
        srcChainTxMeta={mockSrcChainTxMeta}
      />,
    );
  });

  it('renders correct number of steps', () => {
    const mockGetStepStatus = jest.requireMock(
      './BridgeStepDescription',
    ).getStepStatus;
    mockGetStepStatus.mockReturnValue(StatusTypes.PENDING);

    render(
      <BridgeStepList
        bridgeHistoryItem={mockBridgeHistoryItem}
        srcChainTxMeta={mockSrcChainTxMeta}
      />,
    );

    const StepProgressBarItem = jest.requireMock(
      './StepProgressBarItem',
    ).default;
    expect(StepProgressBarItem).toHaveBeenCalledTimes(mockSteps.length);
  });

  it('handles missing bridgeHistoryItem', () => {
    render(<BridgeStepList />);

    const StepProgressBarItem = jest.requireMock(
      './StepProgressBarItem',
    ).default;
    expect(StepProgressBarItem).not.toHaveBeenCalled();
  });

  it('handles missing srcChainTxMeta', () => {
    const mockGetStepStatus = jest.requireMock(
      './BridgeStepDescription',
    ).getStepStatus;
    mockGetStepStatus.mockReturnValue(StatusTypes.PENDING);

    render(<BridgeStepList bridgeHistoryItem={mockBridgeHistoryItem} />);

    const StepProgressBarItem = jest.requireMock(
      './StepProgressBarItem',
    ).default;
    expect(StepProgressBarItem).toHaveBeenCalledTimes(mockSteps.length);
  });

  it('passes correct props to StepProgressBarItem', () => {
    const mockGetStepStatus = jest.requireMock(
      './BridgeStepDescription',
    ).getStepStatus;
    mockGetStepStatus.mockImplementation(({ step }: { step: Step }) =>
      step.action === ActionTypes.BRIDGE ? StatusTypes.PENDING : null,
    );

    render(
      <BridgeStepList
        bridgeHistoryItem={mockBridgeHistoryItem}
        srcChainTxMeta={mockSrcChainTxMeta}
      />,
    );

    const StepProgressBarItem = jest.requireMock(
      './StepProgressBarItem',
    ).default;
    expect(StepProgressBarItem).toHaveBeenCalledTimes(mockSteps.length);

    // Check first step props
    expect(StepProgressBarItem).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        stepStatus: StatusTypes.PENDING,
        isLastItem: false,
        isEdgeComplete: false,
      }),
      expect.any(Object),
    );

    // Check last step props
    expect(StepProgressBarItem).toHaveBeenNthCalledWith(
      mockSteps.length,
      expect.objectContaining({
        stepStatus: null,
        isLastItem: true,
        isEdgeComplete: false,
      }),
      expect.any(Object),
    );
  });
});
