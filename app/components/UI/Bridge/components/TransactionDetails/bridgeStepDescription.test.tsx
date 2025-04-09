import React from 'react';
import { render } from '@testing-library/react-native';
import BridgeStepDescription from './bridgeStepDescription';
import { ActionTypes, StatusTypes } from '@metamask/bridge-status-controller';
import { NetworkConfiguration } from '@metamask/network-controller';
import { Step } from '@metamask/bridge-controller';

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
});
