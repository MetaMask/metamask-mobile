import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsDiscoveryBanner from './PerpsDiscoveryBanner';

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      banner: {},
      textContainer: {},
      perpsLogo: {},
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) => {
    if (key === 'perps.discovery_banner.title') {
      return `Trade ${params?.symbol} perp`;
    }
    if (key === 'perps.discovery_banner.subtitle') {
      return `Multiply your P&L up to ${params?.leverage}`;
    }
    return key;
  },
}));

describe('PerpsDiscoveryBanner', () => {
  const defaultProps = {
    symbol: 'ETH',
    maxLeverage: '40x',
    onPress: jest.fn(),
    testID: 'perps-discovery-banner',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title with symbol', () => {
    const { getByText } = render(<PerpsDiscoveryBanner {...defaultProps} />);
    expect(getByText('Trade ETH perp')).toBeOnTheScreen();
  });

  it('renders subtitle with leverage', () => {
    const { getByText } = render(<PerpsDiscoveryBanner {...defaultProps} />);
    expect(getByText('Multiply your P&L up to 40x')).toBeOnTheScreen();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <PerpsDiscoveryBanner {...defaultProps} onPress={mockOnPress} />,
    );
    fireEvent.press(getByTestId('perps-discovery-banner'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders logo image', () => {
    const { getByTestId } = render(<PerpsDiscoveryBanner {...defaultProps} />);
    expect(getByTestId('perps-discovery-banner-logo')).toBeOnTheScreen();
  });

  it('renders with different symbol', () => {
    const { getByText } = render(
      <PerpsDiscoveryBanner {...defaultProps} symbol="BTC" />,
    );
    expect(getByText('Trade BTC perp')).toBeOnTheScreen();
  });

  it('renders with different leverage', () => {
    const { getByText } = render(
      <PerpsDiscoveryBanner {...defaultProps} maxLeverage="100x" />,
    );
    expect(getByText('Multiply your P&L up to 100x')).toBeOnTheScreen();
  });
});
