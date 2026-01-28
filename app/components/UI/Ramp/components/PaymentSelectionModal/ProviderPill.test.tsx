import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import ProviderPill from './ProviderPill';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import type { Provider } from '@metamask/ramps-controller';

jest.mock('../../../../Base/RemoteImage', () => jest.fn(() => null));

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

const mockProvider: Provider = {
  id: '/providers/transak',
  name: 'Transak',
  environmentType: 'PRODUCTION',
  description: 'Test provider',
  hqAddress: 'Test Address',
  links: [],
  logos: {
    light: 'https://example.com/logo-light.png',
    dark: 'https://example.com/logo-dark.png',
    height: 24,
    width: 90,
  },
};

const mockProviderWithoutLogo: Provider = {
  ...mockProvider,
  logos: {
    light: '',
    dark: '',
    height: 0,
    width: 0,
  },
};

describe('ProviderPill', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders provider name when no logo', () => {
    const { getByText } = renderWithTheme(
      <ProviderPill provider={mockProviderWithoutLogo} />,
    );

    expect(getByText('Transak')).toBeOnTheScreen();
  });

  it('renders null when provider is null', () => {
    const { toJSON } = renderWithTheme(<ProviderPill provider={null} />);

    expect(toJSON()).toBeNull();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = renderWithTheme(
      <ProviderPill provider={mockProviderWithoutLogo} onPress={mockOnPress} />,
    );

    fireEvent.press(getByText('Transak'));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders without onPress handler', () => {
    const { getByText } = renderWithTheme(
      <ProviderPill provider={mockProviderWithoutLogo} />,
    );

    expect(getByText('Transak')).toBeOnTheScreen();
  });

  it('matches snapshot with provider name', () => {
    const { toJSON } = renderWithTheme(
      <ProviderPill provider={mockProviderWithoutLogo} />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot with logo', () => {
    const { toJSON } = renderWithTheme(
      <ProviderPill provider={mockProvider} />,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
