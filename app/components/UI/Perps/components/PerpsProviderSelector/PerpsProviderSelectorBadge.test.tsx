import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import PerpsProviderSelectorBadge from './PerpsProviderSelectorBadge';
import { usePerpsProvider } from '../../hooks/usePerpsProvider';
import Routes from '../../../../../constants/navigation/Routes';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../hooks/usePerpsProvider', () => ({
  usePerpsProvider: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockUsePerpsProvider = usePerpsProvider as jest.Mock;
const mockUseSelector = useSelector as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate });
  // Default to mainnet
  mockUseSelector.mockReturnValue('mainnet');
});

describe('PerpsProviderSelectorBadge', () => {
  it('returns null when isMultiProviderEnabled is false', () => {
    mockUsePerpsProvider.mockReturnValue({
      activeProvider: 'hyperliquid',
      isMultiProviderEnabled: false,
    });

    const { toJSON } = render(<PerpsProviderSelectorBadge testID="badge" />);

    expect(toJSON()).toBeNull();
  });

  it('renders provider name when multi-provider is enabled', () => {
    mockUsePerpsProvider.mockReturnValue({
      activeProvider: 'hyperliquid',
      isMultiProviderEnabled: true,
    });

    const { getByText } = render(<PerpsProviderSelectorBadge testID="badge" />);

    expect(getByText('HyperLiquid')).toBeTruthy();
  });

  it('shows MYX when activeProvider is myx', () => {
    mockUsePerpsProvider.mockReturnValue({
      activeProvider: 'myx',
      isMultiProviderEnabled: true,
    });

    const { getByText } = render(<PerpsProviderSelectorBadge testID="badge" />);

    expect(getByText('MYX')).toBeTruthy();
  });

  it('shows All Providers when activeProvider is aggregated', () => {
    mockUsePerpsProvider.mockReturnValue({
      activeProvider: 'aggregated',
      isMultiProviderEnabled: true,
    });

    const { getByText } = render(<PerpsProviderSelectorBadge testID="badge" />);

    expect(getByText('All Providers')).toBeOnTheScreen();
  });

  it('navigates to provider selection on press', () => {
    mockUsePerpsProvider.mockReturnValue({
      activeProvider: 'hyperliquid',
      isMultiProviderEnabled: true,
    });

    const { getByTestId } = render(
      <PerpsProviderSelectorBadge testID="badge" />,
    );

    fireEvent.press(getByTestId('badge'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.SELECT_PROVIDER,
    });
  });

  it('has correct accessibility attributes', () => {
    mockUsePerpsProvider.mockReturnValue({
      activeProvider: 'myx',
      isMultiProviderEnabled: true,
    });

    const { getByTestId } = render(
      <PerpsProviderSelectorBadge testID="badge" />,
    );

    const badge = getByTestId('badge');
    expect(badge.props.accessibilityRole).toBe('button');
    expect(badge.props.accessibilityLabel).toContain('MYX');
    expect(badge.props.accessibilityLabel).toContain('Mainnet');
  });

  it('includes Testnet in accessibility label when on testnet', () => {
    mockUseSelector.mockReturnValue('testnet');
    mockUsePerpsProvider.mockReturnValue({
      activeProvider: 'hyperliquid',
      isMultiProviderEnabled: true,
    });

    const { getByTestId } = render(
      <PerpsProviderSelectorBadge testID="badge" />,
    );

    const badge = getByTestId('badge');
    expect(badge.props.accessibilityLabel).toContain('Testnet');
  });
});
