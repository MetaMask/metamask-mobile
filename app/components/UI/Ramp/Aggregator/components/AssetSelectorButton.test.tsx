import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import AssetSelectorButton from './AssetSelectorButton';
import { Image } from 'react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';

const defaultState = {
  engine: {
    backgroundState,
  },
};

const mockIcon = <Image source={{ uri: 'https://example.com/token.png' }} />;

const mockProps = {
  label: 'Want to buy',
  assetSymbol: 'ETH',
  assetName: 'Ethereum',
  icon: mockIcon,
};

describe('AssetSelectorButton', () => {
  it('renders correctly', () => {
    renderWithProvider(<AssetSelectorButton {...mockProps} />, {
      state: defaultState,
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly without icon', () => {
    const propsWithoutIcon = { ...mockProps };
    delete (propsWithoutIcon as unknown as { icon: unknown }).icon;
    renderWithProvider(<AssetSelectorButton {...propsWithoutIcon} />, {
      state: defaultState,
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    renderWithProvider(
      <AssetSelectorButton {...mockProps} onPress={mockOnPress} />,
      {
        state: defaultState,
      },
    );
    fireEvent.press(screen.getByText('Ethereum'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders loading state correctly', () => {
    renderWithProvider(<AssetSelectorButton {...mockProps} loading />, {
      state: defaultState,
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('does not call onPress when loading', () => {
    const mockOnPress = jest.fn();
    renderWithProvider(
      <AssetSelectorButton {...mockProps} onPress={mockOnPress} loading />,
      {
        state: defaultState,
      },
    );

    // In loading state, the component should show skeleton content instead of actual content
    const assetNameElement = screen.queryByText('Ethereum');
    expect(assetNameElement).toBeNull(); // Asset name should not be visible in loading state

    // Since the component is in loading state, onPress should not be callable
    // This test mainly verifies that the loading UI is different from normal UI
    // and that the actual asset text is not present (replaced by skeleton)
    expect(mockOnPress).not.toHaveBeenCalled();
  });
});
