import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import ProviderSelection from './ProviderSelection';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import type { Provider } from '@metamask/ramps-controller';

const mockGetQuotes = jest.fn().mockResolvedValue({
  success: [],
  sorted: [],
  error: [],
  customActions: [],
});

jest.mock('../../hooks/useRampsController', () => ({
  useRampsController: () => ({
    userRegion: null,
    selectedToken: null,
    paymentMethods: [],
    selectedPaymentMethod: null,
    getQuotes: mockGetQuotes,
    setSelectedQuote: jest.fn(),
  }),
}));

jest.mock('../../hooks/useRampAccountAddress', () => ({
  __esModule: true,
  default: () => null,
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
        amount={100}
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
    mockGetQuotes.mockResolvedValue({
      success: [],
      sorted: [],
      error: [],
      customActions: [],
    });
  });

  it('matches snapshot when no quotes loaded', () => {
    const { toJSON } = renderWithProvider();
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls onBack when back button is pressed', () => {
    const { getByTestId } = renderWithProvider();
    fireEvent.press(getByTestId('button-icon'));
    expect(mockOnBack).toHaveBeenCalled();
  });

});
