import React from 'react';
import { render } from '@testing-library/react-native';
import BridgeStepDescription, { getStepStatus } from './BridgeStepDescription';
import {
  ActionTypes,
  StatusTypes,
  BridgeHistoryItem,
  StatusResponse,
  SrcChainStatus,
} from '@metamask/bridge-status-controller';
import { NetworkConfiguration } from '@metamask/network-controller';
import { Step } from '@metamask/bridge-controller';
import {
  TransactionMeta,
  TransactionStatus,
  CHAIN_IDS,
} from '@metamask/transaction-controller';
import { CaipChainId } from '@metamask/utils';

describe('BridgeStepDescription', () => {
  const mockStep = {
    action: ActionTypes.BRIDGE,
    srcChainId: 1,
    destChainId: 2,
    srcAsset: { symbol: 'ETH' },
    destAsset: { symbol: 'ETH' },
    srcAmount: '1',
    destAmount: '1',
    protocol: 'test-protocol',
  } as unknown as Step;

  const mockSwapStep = {
    action: ActionTypes.SWAP,
    srcChainId: 1,
    destChainId: 1,
    srcAsset: { symbol: 'ETH' },
    destAsset: { symbol: 'USDC' },
    srcAmount: '1',
    destAmount: '1000',
    protocol: 'test-protocol',
  } as unknown as Step;

  const mockNetworkConfigurations = {
    '0x1': {
      chainId: '0x1',
    } as unknown as NetworkConfiguration,
    '0x2': {
      chainId: '0x2',
    } as unknown as NetworkConfiguration,
  };

  it('should render bridge action without crashing', () => {
    const { getByText } = render(
      <BridgeStepDescription
        step={mockStep}
        networkConfigurationsByChainId={mockNetworkConfigurations}
        stepStatus={StatusTypes.PENDING}
      />,
    );

    expect(getByText(/ETH/)).toBeTruthy();
  });

  it('should render swap action without crashing', () => {
    const { getByText } = render(
      <BridgeStepDescription
        step={mockSwapStep}
        networkConfigurationsByChainId={mockNetworkConfigurations}
        stepStatus={StatusTypes.PENDING}
      />,
    );

    expect(getByText(/ETH/)).toBeTruthy();
    expect(getByText(/USDC/)).toBeTruthy();
  });

  it('should render with time prop', () => {
    const { getByText } = render(
      <BridgeStepDescription
        step={mockStep}
        networkConfigurationsByChainId={mockNetworkConfigurations}
        stepStatus={StatusTypes.PENDING}
        time="10:00 AM"
      />,
    );

    expect(getByText(/10:00 AM/)).toBeTruthy();
    expect(getByText(/ETH/)).toBeTruthy();
  });

  it('should render with COMPLETE status', () => {
    const { getByText } = render(
      <BridgeStepDescription
        step={mockStep}
        networkConfigurationsByChainId={mockNetworkConfigurations}
        stepStatus={StatusTypes.COMPLETE}
      />,
    );

    expect(getByText(/ETH/)).toBeTruthy();
  });

  it('should handle missing destSymbol in bridge action', () => {
    const stepWithoutDestSymbol = {
      ...mockStep,
      destAsset: { symbol: undefined },
    } as unknown as Step;

    const { queryByText } = render(
      <BridgeStepDescription
        step={stepWithoutDestSymbol}
        networkConfigurationsByChainId={mockNetworkConfigurations}
        stepStatus={StatusTypes.PENDING}
      />,
    );

    expect(queryByText(/ETH/)).toBeFalsy();
  });

  it('should handle missing symbols in swap action', () => {
    const stepWithoutSymbols = {
      ...mockSwapStep,
      srcAsset: { symbol: undefined },
      destAsset: { symbol: undefined },
    } as unknown as Step;

    const { queryByText } = render(
      <BridgeStepDescription
        step={stepWithoutSymbols}
        networkConfigurationsByChainId={mockNetworkConfigurations}
        stepStatus={StatusTypes.PENDING}
      />,
    );

    expect(queryByText(/ETH/)).toBeFalsy();
    expect(queryByText(/USDC/)).toBeFalsy();
  });

  it('should render with correct text variant based on status', () => {
    const { getByText } = render(
      <BridgeStepDescription
        step={mockStep}
        networkConfigurationsByChainId={mockNetworkConfigurations}
        stepStatus={StatusTypes.PENDING}
      />,
    );

    const textElement = getByText(/ETH/);
    expect(textElement.props.style).toHaveProperty('fontWeight', '500');
  });

  it('should render with correct text color based on status', () => {
    const { getByText } = render(
      <BridgeStepDescription
        step={mockStep}
        networkConfigurationsByChainId={mockNetworkConfigurations}
        stepStatus={StatusTypes.UNKNOWN}
      />,
    );

    const textElement = getByText(/ETH/);
    expect(textElement.props.style).toHaveProperty('color', '#686e7d');
  });

  it('should render bridge action with COMPLETE status text', () => {
    const { getByText } = render(
      <BridgeStepDescription
        step={mockStep}
        networkConfigurationsByChainId={mockNetworkConfigurations}
        stepStatus={StatusTypes.COMPLETE}
      />,
    );

    expect(getByText(/ETH/)).toBeTruthy();
    const textElement = getByText(/ETH/);
    expect(textElement.props.style).toHaveProperty('color', '#121314');
    expect(textElement.props.style).toHaveProperty('fontWeight', '400');
  });

  it('should render swap action with COMPLETE status text', () => {
    const { getByText } = render(
      <BridgeStepDescription
        step={mockSwapStep}
        networkConfigurationsByChainId={mockNetworkConfigurations}
        stepStatus={StatusTypes.COMPLETE}
      />,
    );

    expect(getByText(/ETH/)).toBeTruthy();
    expect(getByText(/USDC/)).toBeTruthy();
    const textElement = getByText(/ETH/);
    expect(textElement.props.style).toHaveProperty('color', '#121314');
    expect(textElement.props.style).toHaveProperty('fontWeight', '400');
  });

  it('should render with time and COMPLETE status', () => {
    const { getByText } = render(
      <BridgeStepDescription
        step={mockStep}
        networkConfigurationsByChainId={mockNetworkConfigurations}
        stepStatus={StatusTypes.COMPLETE}
        time="10:00 AM"
      />,
    );

    expect(getByText(/10:00 AM/)).toBeTruthy();
    expect(getByText(/ETH/)).toBeTruthy();
    const textElement = getByText(/ETH/);
    expect(textElement.props.style).toHaveProperty('color', '#121314');
    expect(textElement.props.style).toHaveProperty('fontWeight', '400');
  });

  it('should handle bridge action with missing destChainId', () => {
    const stepWithoutDestChainId = {
      ...mockStep,
      destChainId: undefined,
    } as unknown as Step;

    const { getByText } = render(
      <BridgeStepDescription
        step={stepWithoutDestChainId}
        networkConfigurationsByChainId={mockNetworkConfigurations}
        stepStatus={StatusTypes.PENDING}
      />,
    );

    const textElement = getByText(/ETH/);
    expect(textElement.props.style).toHaveProperty('color', '#121314');
    expect(textElement.props.style).toHaveProperty('fontWeight', '500');
  });

  it('should handle bridge action with missing network configuration', () => {
    const stepWithUnknownChain = {
      ...mockStep,
      destChainId: 999, // Chain ID that doesn't exist in mockNetworkConfigurations
    } as unknown as Step;

    const { getByText } = render(
      <BridgeStepDescription
        step={stepWithUnknownChain}
        networkConfigurationsByChainId={mockNetworkConfigurations}
        stepStatus={StatusTypes.PENDING}
      />,
    );

    const textElement = getByText(/ETH/);
    expect(textElement.props.style).toHaveProperty('color', '#121314');
    expect(textElement.props.style).toHaveProperty('fontWeight', '500');
  });

  it('should handle swap action with missing srcSymbol', () => {
    const stepWithoutSrcSymbol = {
      ...mockSwapStep,
      srcAsset: { symbol: undefined },
    } as unknown as Step;

    const { queryByText } = render(
      <BridgeStepDescription
        step={stepWithoutSrcSymbol}
        networkConfigurationsByChainId={mockNetworkConfigurations}
        stepStatus={StatusTypes.PENDING}
      />,
    );

    expect(queryByText(/ETH/)).toBeFalsy();
    expect(queryByText(/USDC/)).toBeFalsy();
  });

  it('should handle swap action with missing destSymbol', () => {
    const stepWithoutDestSymbol = {
      ...mockSwapStep,
      destAsset: { symbol: undefined },
    } as unknown as Step;

    const { queryByText } = render(
      <BridgeStepDescription
        step={stepWithoutDestSymbol}
        networkConfigurationsByChainId={mockNetworkConfigurations}
        stepStatus={StatusTypes.PENDING}
      />,
    );

    expect(queryByText(/ETH/)).toBeFalsy();
    expect(queryByText(/USDC/)).toBeFalsy();
  });

  it('should handle swap action with null status', () => {
    const { getByText } = render(
      <BridgeStepDescription
        step={mockSwapStep}
        networkConfigurationsByChainId={mockNetworkConfigurations}
        stepStatus={null}
      />,
    );

    expect(getByText(/ETH/)).toBeTruthy();
    expect(getByText(/USDC/)).toBeTruthy();
    const textElement = getByText(/ETH/);
    expect(textElement.props.style).toHaveProperty('color', '#686e7d');
    expect(textElement.props.style).toHaveProperty('fontWeight', '400');
  });

  it('should handle bridge action with null status', () => {
    const { getByText } = render(
      <BridgeStepDescription
        step={mockStep}
        networkConfigurationsByChainId={mockNetworkConfigurations}
        stepStatus={null}
      />,
    );

    expect(getByText(/ETH/)).toBeTruthy();
    const textElement = getByText(/ETH/);
    expect(textElement.props.style).toHaveProperty('color', '#686e7d');
    expect(textElement.props.style).toHaveProperty('fontWeight', '400');
  });

  describe('getStepStatus', () => {
    const mockBridgeHistoryItem: BridgeHistoryItem = {
      status: {
        status: StatusTypes.COMPLETE,
        srcChain: {
          chainId: 'eip155:1' as CaipChainId,
          status: StatusTypes.COMPLETE,
        } as unknown as SrcChainStatus,
      } as StatusResponse,
      quote: {
        srcChainId: 1,
        requestId: 'test-request-id',
        srcAsset: {
          name: 'ETH',
          assetId: 'eip155:1',
          symbol: 'ETH',
          chainId: 1,
          address: '0x0000000000000000000000000000000000000000',
          decimals: 18,
        },
        srcTokenAmount: '1',
        destChainId: 1,
        destAsset: {
          name: 'ETH',
          assetId: 'eip155:1',
          symbol: 'ETH',
          chainId: 1,
          address: '0x0000000000000000000000000000000000000000',
          decimals: 18,
        },
        destTokenAmount: '1',
        feeData: {
          metabridge: {
            amount: '0.1',
            asset: {
              name: 'ETH',
              assetId: 'eip155:1',
              symbol: 'ETH',
              chainId: 1,
              address: '0x0000000000000000000000000000000000000000',
              decimals: 18,
            },
          },
        },
        bridgeId: 'test-bridge-id',
        bridges: [],
        steps: [],
      },
      txMetaId: 'test-tx-meta-id',
      estimatedProcessingTimeInSeconds: 0,
      slippagePercentage: 0,
      account: '0x123',
      hasApprovalTx: false,
    };

    const mockSrcChainTxMeta: TransactionMeta = {
      chainId: CHAIN_IDS.MAINNET,
      id: 'test-id',
      networkClientId: 'test-network-client-id',
      time: 1234567890,
      txParams: {},
      status: TransactionStatus.confirmed,
    } as unknown as TransactionMeta;

    it('should return UNKNOWN when bridgeHistoryItem is undefined', () => {
      const result = getStepStatus({
        bridgeHistoryItem: undefined,
        step: mockStep,
      });
      expect(result).toBe(StatusTypes.UNKNOWN);
    });

    it('should return correct status for SWAP action when source chain tx is confirmed', () => {
      const result = getStepStatus({
        bridgeHistoryItem: mockBridgeHistoryItem,
        step: mockSwapStep,
        srcChainTxMeta: mockSrcChainTxMeta,
      });
      expect(result).toBe(StatusTypes.COMPLETE);
    });

    it('should return correct status for SWAP action when source chain tx is not confirmed', () => {
      const result = getStepStatus({
        bridgeHistoryItem: mockBridgeHistoryItem,
        step: mockSwapStep,
        srcChainTxMeta: {
          ...mockSrcChainTxMeta,
          status: TransactionStatus.submitted,
        } as unknown as TransactionMeta,
      });
      expect(result).toBe(StatusTypes.PENDING);
    });

    it('should return correct status for BRIDGE action', () => {
      const result = getStepStatus({
        bridgeHistoryItem: mockBridgeHistoryItem,
        step: mockStep,
      });
      expect(result).toBe(StatusTypes.COMPLETE);
    });

    it('should return UNKNOWN for unknown action type', () => {
      const unknownStep: Step = {
        ...mockStep,
        action: 'UNKNOWN_ACTION' as ActionTypes,
      };
      const result = getStepStatus({
        bridgeHistoryItem: mockBridgeHistoryItem,
        step: unknownStep,
      });
      expect(result).toBe(StatusTypes.UNKNOWN);
    });
  });
});
