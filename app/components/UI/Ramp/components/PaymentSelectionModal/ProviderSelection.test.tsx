import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import ProviderSelection from './ProviderSelection';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import type { Provider } from '@metamask/ramps-controller';

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
];

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
        onProviderSelect={jest.fn()}
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

  it('calls onBack when back button is pressed', () => {
    const { getByTestId } = renderWithProvider();
    fireEvent.press(getByTestId('button-icon'));
    expect(mockOnBack).toHaveBeenCalled();
  });
});
