import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import PerpsProviderSelectorBadge from './PerpsProviderSelectorBadge';
import { usePerpsProvider } from '../../hooks/usePerpsProvider';
import Routes from '../../../../../constants/navigation/Routes';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../hooks/usePerpsProvider', () => ({
  usePerpsProvider: jest.fn(),
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      badgeContainer: {},
      badgeText: {},
    },
  }),
}));

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  const MockText = ({ children, ...props }: Record<string, unknown>) => (
    <RNText {...props}>{children}</RNText>
  );
  MockText.displayName = 'Text';
  return {
    __esModule: true,
    default: MockText,
    TextVariant: { BodySM: 'BodySM' },
    TextColor: { Alternative: 'Alternative' },
  };
});

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => (
      <View testID="icon" {...props} />
    ),
    IconName: { ArrowDown: 'ArrowDown' },
    IconSize: { Xs: 'Xs' },
    IconColor: { Alternative: 'Alternative' },
  };
});

const mockNavigate = jest.fn();
const mockUsePerpsProvider = usePerpsProvider as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate });
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

  it('defaults to HyperLiquid when activeProvider is aggregated', () => {
    mockUsePerpsProvider.mockReturnValue({
      activeProvider: 'aggregated',
      isMultiProviderEnabled: true,
    });

    const { getByText } = render(<PerpsProviderSelectorBadge testID="badge" />);

    expect(getByText('HyperLiquid')).toBeTruthy();
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
  });
});
