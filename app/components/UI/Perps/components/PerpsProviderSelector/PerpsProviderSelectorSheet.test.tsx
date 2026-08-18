import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { usePerpsProvider } from '../../hooks/usePerpsProvider';
import PerpsProviderSelectorSheet from './PerpsProviderSelectorSheet';

jest.mock('../../hooks/usePerpsProvider', () => ({
  usePerpsProvider: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const mockUsePerpsProvider = usePerpsProvider as jest.Mock;

const defaultProps = {
  onClose: jest.fn(),
  onOptionSelect: jest.fn(),
  testID: 'provider-sheet',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUsePerpsProvider.mockReturnValue({
    availableProviders: ['hyperliquid', 'myx'],
  });
});

describe('PerpsProviderSelectorSheet', () => {
  it('renders the sheet', () => {
    const { getByTestId } = render(
      <PerpsProviderSelectorSheet {...defaultProps} />,
    );

    expect(getByTestId('provider-sheet')).toBeOnTheScreen();
  });

  it('renders the title string in the header', () => {
    const { getByText } = render(
      <PerpsProviderSelectorSheet {...defaultProps} />,
    );

    expect(getByText('perps.provider_selector.title')).toBeOnTheScreen();
  });

  it('renders only options matching availableProviders', () => {
    mockUsePerpsProvider.mockReturnValue({
      availableProviders: ['hyperliquid'],
    });

    const { getByTestId, queryByTestId } = render(
      <PerpsProviderSelectorSheet {...defaultProps} />,
    );

    expect(
      getByTestId('provider-sheet-option-hyperliquid-mainnet'),
    ).toBeOnTheScreen();
    expect(
      getByTestId('provider-sheet-option-hyperliquid-testnet'),
    ).toBeOnTheScreen();
    expect(queryByTestId('provider-sheet-option-myx-mainnet')).toBeNull();
    expect(queryByTestId('provider-sheet-option-myx-testnet')).toBeNull();
  });

  it('renders all matching options when all providers available', () => {
    mockUsePerpsProvider.mockReturnValue({
      availableProviders: ['hyperliquid', 'myx'],
    });

    const { getByTestId } = render(
      <PerpsProviderSelectorSheet {...defaultProps} />,
    );

    expect(
      getByTestId('provider-sheet-option-hyperliquid-mainnet'),
    ).toBeOnTheScreen();
    expect(
      getByTestId('provider-sheet-option-hyperliquid-testnet'),
    ).toBeOnTheScreen();
    expect(getByTestId('provider-sheet-option-myx-mainnet')).toBeOnTheScreen();
    expect(getByTestId('provider-sheet-option-myx-testnet')).toBeOnTheScreen();
  });

  it('calls onOptionSelect when an option is pressed', async () => {
    const onOptionSelect = jest.fn().mockResolvedValue(undefined);

    const { getByTestId } = render(
      <PerpsProviderSelectorSheet
        {...defaultProps}
        onOptionSelect={onOptionSelect}
      />,
    );

    await act(async () => {
      fireEvent.press(getByTestId('provider-sheet-option-hyperliquid-mainnet'));
    });

    expect(onOptionSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'hyperliquid-mainnet',
        providerId: 'hyperliquid',
      }),
    );
  });

  it('marks the selected option as selected', () => {
    const { getByTestId } = render(
      <PerpsProviderSelectorSheet
        {...defaultProps}
        selectedOptionId="hyperliquid-mainnet"
      />,
    );

    expect(
      getByTestId('provider-sheet-option-hyperliquid-mainnet').props
        .accessibilityState?.selected,
    ).toBe(true);
  });

  it('renders Mainnet and Testnet tags', () => {
    const { getByTestId } = render(
      <PerpsProviderSelectorSheet {...defaultProps} />,
    );

    expect(
      getByTestId('provider-sheet-option-hyperliquid-mainnet-tag'),
    ).toHaveTextContent('Mainnet');
    expect(
      getByTestId('provider-sheet-option-hyperliquid-testnet-tag'),
    ).toHaveTextContent('Testnet');
  });

  it('closes the sheet when header close is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <PerpsProviderSelectorSheet {...defaultProps} onClose={onClose} />,
    );

    fireEvent.press(getByTestId('provider-sheet-close-button'));

    expect(onClose).toHaveBeenCalled();
  });
});
