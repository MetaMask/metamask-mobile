import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import ProviderSelection from './ProviderSelection';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import type { Provider } from '@metamask/ramps-controller';

jest.mock('../../../../Base/RemoteImage', () => jest.fn(() => null));

jest.mock('react-native', () => {
  const actualReactNative = jest.requireActual('react-native');
  return {
    ...actualReactNative,
    useWindowDimensions: () => ({
      width: 375,
      height: 812,
    }),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockProviders: Provider[] = [
  {
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
  },
  {
    id: '/providers/moonpay',
    name: 'MoonPay',
    environmentType: 'PRODUCTION',
    description: 'Test provider 2',
    hqAddress: 'Test Address 2',
    links: [],
    logos: {
      light: 'https://example.com/moonpay-light.png',
      dark: 'https://example.com/moonpay-dark.png',
      height: 24,
      width: 90,
    },
  },
];

const mockOnProviderSelect = jest.fn();
const mockOnBack = jest.fn();

function renderWithProvider(
  providers: Provider[] = mockProviders,
  selectedProvider: Provider | null = mockProviders[0],
) {
  return renderScreen(
    () => (
      <ProviderSelection
        providers={providers}
        selectedProvider={selectedProvider}
        onProviderSelect={mockOnProviderSelect}
        onBack={mockOnBack}
      />
    ),
    {
      name: 'ProviderSelection',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('ProviderSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithProvider();
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays providers list with names', () => {
    const { getByText } = renderWithProvider();

    expect(getByText('Transak')).toBeOnTheScreen();
    expect(getByText('MoonPay')).toBeOnTheScreen();
  });

  it('calls onProviderSelect when provider is pressed', () => {
    const { getByText } = renderWithProvider();

    const moonPayProvider = getByText('MoonPay');
    fireEvent.press(moonPayProvider);

    expect(mockOnProviderSelect).toHaveBeenCalledWith(mockProviders[1]);
  });

  it('displays fallback avatar when provider has no logo', () => {
    const providersWithoutLogo: Provider[] = [
      {
        id: '/providers/test',
        name: 'TestProvider',
        environmentType: 'PRODUCTION',
        description: 'Test provider without logo',
        hqAddress: 'Test Address',
        links: [],
        logos: {
          light: '',
          dark: '',
          height: 0,
          width: 0,
        },
      },
    ];

    const { getByText } = renderWithProvider(providersWithoutLogo, null);

    expect(getByText('T')).toBeOnTheScreen();
  });
});
