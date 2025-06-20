import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import VerifyIdentity from './VerifyIdentity';
import Routes from '../../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();

interface MockQuote {
  id: string;
  amount: number;
  currency: string;
}

// Mock the quote object
const mockQuote: MockQuote = {
  id: 'test-quote-id',
  amount: 100,
  currency: 'USD',
};

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetNavigationOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
    }),
    useRoute: () => ({
      params: { quote: mockQuote },
    }),
  };
});

jest.mock('../../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn().mockReturnValue({
    title: 'Verify your identity',
  }),
}));

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.DEPOSIT.VERIFY_IDENTITY,
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

describe('VerifyIdentity Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    render(VerifyIdentity);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls setOptions when the component mounts', () => {
    render(VerifyIdentity);
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Verify your identity',
      }),
    );
  });

  it('navigates to next screen on "Get started" button press', async () => {
    render(VerifyIdentity);
    fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.BASIC_INFO, {
        quote: mockQuote,
      });
    });
  });
});
