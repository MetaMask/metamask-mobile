jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(),
  canOpenURL: jest.fn(),
  getInitialURL: jest.fn(),
}));

// Third party dependencies.
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { View } from 'react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';

// Internal dependencies
import NetworkSelectorList from './NetworkSelectorList';
import { CaipChainId } from '@metamask/utils';

const mockNetworks = [
  {
    id: 'network-1',
    name: 'Ethereum Mainnet',
    imageSource: { uri: 'https://ethereum.org/icon.png' },
    isSelected: false,
    yOffset: 0,
    caipChainId: 'eip155:1' as const,
  },
  {
    id: 'network-2',
    name: 'Polygon',
    imageSource: { uri: 'https://polygon.org/icon.png' },
    isSelected: true,
    yOffset: 100,
    caipChainId: 'eip155:137' as const,
  },
];

describe('NetworkSelectorList', () => {
  const mockOnSelectNetwork = jest.fn();
  const mockRenderRightAccessory = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    const { toJSON } = renderWithProvider(
      <NetworkSelectorList
        networks={mockNetworks}
        onSelectNetwork={mockOnSelectNetwork}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders all networks in the list', () => {
    const { getByText } = renderWithProvider(
      <NetworkSelectorList
        networks={mockNetworks}
        onSelectNetwork={mockOnSelectNetwork}
      />,
    );

    expect(getByText('Ethereum Mainnet')).toBeTruthy();
    expect(getByText('Polygon')).toBeTruthy();
  });

  it('handles network selection correctly', () => {
    const { getByText } = renderWithProvider(
      <NetworkSelectorList
        networks={mockNetworks}
        onSelectNetwork={mockOnSelectNetwork}
      />,
    );

    fireEvent.press(getByText('Ethereum Mainnet'));
    expect(mockOnSelectNetwork).toHaveBeenCalledWith('eip155:1', false);
  });

  it('handles selectedChainIds prop correctly', () => {
    const selectedChainIds: CaipChainId[] = ['eip155:1'];
    const { getByTestId } = renderWithProvider(
      <NetworkSelectorList
        networks={mockNetworks}
        onSelectNetwork={mockOnSelectNetwork}
        selectedChainIds={selectedChainIds}
      />,
    );

    expect(getByTestId('Ethereum Mainnet-selected')).toBeTruthy();
    expect(getByTestId('Polygon-not-selected')).toBeTruthy();
  });

  it('renders right accessory when provided', () => {
    mockRenderRightAccessory.mockReturnValue(<View testID="right-accessory" />);
    const { getAllByTestId } = renderWithProvider(
      <NetworkSelectorList
        networks={mockNetworks}
        onSelectNetwork={mockOnSelectNetwork}
        renderRightAccessory={mockRenderRightAccessory}
      />,
    );

    expect(getAllByTestId('right-accessory')).toHaveLength(2);
    expect(mockRenderRightAccessory).toHaveBeenCalledWith(
      'eip155:1',
      'Ethereum Mainnet',
    );
    expect(mockRenderRightAccessory).toHaveBeenCalledWith(
      'eip155:137',
      'Polygon',
    );
  });
});
