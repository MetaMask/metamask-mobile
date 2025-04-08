import React from 'react';
import { render } from '@testing-library/react-native';
import BridgeStepList from './bridgeStepList';
import { NetworkConfiguration } from '@metamask/network-controller';
import { TransactionMeta } from '@metamask/transaction-controller';
import { BridgeHistoryItem, StatusTypes, ActionTypes } from '@metamask/bridge-status-controller';
import { Step } from '@metamask/bridge-controller';

jest.mock('./stepProgressBarItem', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: jest.fn(({ children, ...props }) => (
      <View testID="step-progress-bar-item" {...props}>
        {children}
      </View>
    )),
  };
});

jest.mock('./bridgeStepDescription', () => ({
  __esModule: true,
  default: jest.fn(() => null),
  getStepStatus: jest.fn(),
}));

describe('BridgeStepList', () => {
  const mockNetworkConfigurations = {
    '0x1': { chainId: '0x1' } as unknown as NetworkConfiguration,
    '0x89': { chainId: '0x89' } as unknown as NetworkConfiguration,
  };

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
        networkConfigurationsByChainId={mockNetworkConfigurations}
      />,
    );
  });

  it('renders correct number of steps', () => {
    const mockGetStepStatus = jest.requireMock('./bridgeStepDescription').getStepStatus;
    mockGetStepStatus.mockReturnValue(StatusTypes.PENDING);

    const { getAllByTestId } = render(
      <BridgeStepList
        bridgeHistoryItem={mockBridgeHistoryItem}
        srcChainTxMeta={mockSrcChainTxMeta}
        networkConfigurationsByChainId={mockNetworkConfigurations}
      />,
    );

    const steps = getAllByTestId('step-progress-bar-item');
    expect(steps).toHaveLength(mockSteps.length);
  });

  it('handles missing bridgeHistoryItem', () => {
    const { queryByTestId } = render(
      <BridgeStepList
        networkConfigurationsByChainId={mockNetworkConfigurations}
      />,
    );

    const steps = queryByTestId('step-progress-bar-item');
    expect(steps).toBeNull();
  });

  it('handles missing srcChainTxMeta', () => {
    const mockGetStepStatus = jest.requireMock('./bridgeStepDescription').getStepStatus;
    mockGetStepStatus.mockReturnValue(StatusTypes.PENDING);

    const { getAllByTestId } = render(
      <BridgeStepList
        bridgeHistoryItem={mockBridgeHistoryItem}
        networkConfigurationsByChainId={mockNetworkConfigurations}
      />,
    );

    const steps = getAllByTestId('step-progress-bar-item');
    expect(steps).toHaveLength(mockSteps.length);
  });

  it('passes correct props to StepProgressBarItem', () => {
    const mockGetStepStatus = jest.requireMock('./bridgeStepDescription').getStepStatus;
    mockGetStepStatus.mockImplementation(({ step }: { step: Step }) => {
      // First step is PENDING, second step is null (as per component logic)
      return step.action === ActionTypes.BRIDGE ? StatusTypes.PENDING : null;
    });

    render(
      <BridgeStepList
        bridgeHistoryItem={mockBridgeHistoryItem}
        srcChainTxMeta={mockSrcChainTxMeta}
        networkConfigurationsByChainId={mockNetworkConfigurations}
      />,
    );

    const StepProgressBarItem = jest.requireMock('./stepProgressBarItem').default;
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
