import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import VerifyIdentity from './VerifyIdentity';
import Routes from '../../../../../../constants/navigation/Routes';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { BuyQuote } from '@consensys/native-ramps-sdk';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockDispatch = jest.fn();
const mockLinkingOpenURL = jest.fn();

const mockQuote = {
  quoteId: 'test-quote-id',
} as BuyQuote;

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      dispatch: mockDispatch,
      setOptions: mockSetNavigationOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
    }),
    useRoute: () => ({
      params: { quote: mockQuote },
    }),
  };
});

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: mockLinkingOpenURL,
  addEventListener: jest.fn(),
}));

jest.mock('../../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn().mockReturnValue({
    title: 'Verify your identity',
  }),
}));

const mockUseDepositSDK = jest.fn().mockReturnValue({
  selectedRegion: { isoCode: 'US' },
});

jest.mock('../../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
}));

const mockNavigateToEnterEmail = jest.fn();

jest.mock('../../hooks/useDepositRouting', () => ({
  useDepositRouting: () => ({
    navigateToEnterEmail: mockNavigateToEnterEmail,
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

  it('renders verify identity screen with all content', () => {
    const { toJSON } = render(VerifyIdentity);
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls setOptions when the component mounts', () => {
    render(VerifyIdentity);
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Verify your identity',
      }),
    );
  });

  it('calls navigateToEnterEmail when "Get started" button is pressed', async () => {
    render(VerifyIdentity);
    fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    await waitFor(() => {
      expect(mockNavigateToEnterEmail).toHaveBeenCalledWith({
        quote: mockQuote,
      });
    });
  });

  it('opens Transak website when Transak link is pressed', () => {
    render(VerifyIdentity);
    fireEvent.press(screen.getByText('Transak'));
    expect(mockLinkingOpenURL).toHaveBeenCalledWith('https://www.transak.com');
  });

  it('opens privacy policy when privacy policy link is pressed', () => {
    render(VerifyIdentity);
    fireEvent.press(screen.getByTestId('privacy-policy-link-1'));
    expect(mockLinkingOpenURL).toHaveBeenCalledWith(
      'https://consensys.net/privacy-policy',
    );
  });

  it('opens US Transak terms when Transak terms link is pressed (US region)', () => {
    render(VerifyIdentity);
    fireEvent.press(screen.getByText("Transak's Terms of Use"));
    expect(mockLinkingOpenURL).toHaveBeenCalledWith(
      'https://www.transak.com/terms-of-service-us',
    );
  });

  it('opens world Transak terms when Transak terms link is pressed (non-US region)', () => {
    mockUseDepositSDK.mockReturnValueOnce({
      selectedRegion: { isoCode: 'GB' },
    });
    render(VerifyIdentity);
    fireEvent.press(screen.getByText("Transak's Terms of Use"));
    expect(mockLinkingOpenURL).toHaveBeenCalledWith(
      'https://www.transak.com/terms-of-service',
    );
  });

  it('opens privacy policy when agreement privacy policy link is pressed', () => {
    render(VerifyIdentity);
    fireEvent.press(screen.getByTestId('privacy-policy-link-2'));
    expect(mockLinkingOpenURL).toHaveBeenCalledWith(
      'https://consensys.net/privacy-policy',
    );
  });
});
