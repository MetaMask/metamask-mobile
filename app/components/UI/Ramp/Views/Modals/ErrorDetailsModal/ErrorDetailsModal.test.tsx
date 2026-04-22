import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import Routes from '../../../../../../constants/navigation/Routes';
import ErrorDetailsModal from './ErrorDetailsModal';

const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => {
  callback?.();
});
const mockReplace = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    replace: mockReplace,
    navigate: mockNavigate,
  }),
}));

jest.mock('react-native-inappbrowser-reborn', () => ({
  isAvailable: jest.fn(),
  open: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    BottomSheet: ReactActual.forwardRef(
      (
        { children }: { children: React.ReactNode },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockOnCloseBottomSheet,
        }));
        return <>{children}</>;
      },
    ),
  };
});

const mockUseParams = jest.fn();
jest.mock('../../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails: jest.fn(),
  useParams: () => mockUseParams(),
}));

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(component, {
    name: 'ErrorDetailsModal',
  });
}

describe('ErrorDetailsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({
      errorMessage: 'This is a test error message.',
    });
  });

  it('renders correctly with error message and close button', () => {
    const { getByTestId, getByText } = renderWithProvider(ErrorDetailsModal);
    expect(getByTestId('error-details-close-button')).toBeOnTheScreen();
    expect(getByText('This is a test error message.')).toBeOnTheScreen();
    expect(getByText('Got it')).toBeOnTheScreen();
  });

  it('renders with a multiline error message', () => {
    mockUseParams.mockReturnValue({
      errorMessage:
        'Error on line 1.\nError on line 2.\nAdditional context for debugging.',
    });

    const { getByText } = renderWithProvider(ErrorDetailsModal);
    expect(getByText(/Error on line 1\./u)).toBeOnTheScreen();
  });

  it('renders with an empty error message', () => {
    mockUseParams.mockReturnValue({
      errorMessage: '',
    });

    const { getByTestId } = renderWithProvider(ErrorDetailsModal);
    expect(getByTestId('error-details-close-button')).toBeOnTheScreen();
  });

  it('renders with provider support info showing contact support button', () => {
    mockUseParams.mockReturnValue({
      errorMessage: 'Provider error occurred.',
      providerName: 'Transak',
      providerSupportUrl: 'https://support.transak.com',
    });

    const { getByText } = renderWithProvider(ErrorDetailsModal);
    expect(getByText('Contact Transak support')).toBeOnTheScreen();
    expect(getByText('Provider error occurred.')).toBeOnTheScreen();
  });

  it('closes the modal when the close button is pressed', () => {
    const { getByTestId } = renderWithProvider(ErrorDetailsModal);
    const closeButton = getByTestId('error-details-close-button');

    fireEvent.press(closeButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('closes the modal when Got it button is pressed', () => {
    const { getByText } = renderWithProvider(ErrorDetailsModal);

    fireEvent.press(getByText('Got it'));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('opens support URL in InAppBrowser when available', async () => {
    (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(true);

    mockUseParams.mockReturnValue({
      errorMessage: 'Provider error occurred.',
      providerName: 'Transak',
      providerSupportUrl: 'https://support.transak.com',
    });

    const { getByText } = renderWithProvider(ErrorDetailsModal);

    fireEvent.press(getByText('Contact Transak support'));

    await waitFor(() => {
      expect(InAppBrowser.open).toHaveBeenCalledWith(
        'https://support.transak.com',
      );
    });
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('falls back to SimpleWebview when InAppBrowser is not available', async () => {
    (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(false);

    mockUseParams.mockReturnValue({
      errorMessage: 'Provider error occurred.',
      providerName: 'Transak',
      providerSupportUrl: 'https://support.transak.com',
    });

    const { getByText } = renderWithProvider(ErrorDetailsModal);

    fireEvent.press(getByText('Contact Transak support'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: 'https://support.transak.com',
          title: 'Transak',
        },
      });
    });
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('does not render contact support button when provider info is missing', () => {
    const { queryByText } = renderWithProvider(ErrorDetailsModal);

    expect(queryByText(/Contact.*support/u)).not.toBeOnTheScreen();
  });

  it('renders with change provider button', () => {
    mockUseParams.mockReturnValue({
      errorMessage: 'No quotes available.',
      showChangeProvider: true,
    });

    const { getByText } = renderWithProvider(ErrorDetailsModal);
    expect(getByText('Change provider')).toBeOnTheScreen();
    expect(getByText('No quotes available.')).toBeOnTheScreen();
  });

  it('navigates to provider selection when Change provider is pressed', () => {
    mockUseParams.mockReturnValue({
      errorMessage: 'No quotes available.',
      showChangeProvider: true,
      amount: 250,
    });

    const { getByText } = renderWithProvider(ErrorDetailsModal);

    fireEvent.press(getByText('Change provider'));

    expect(mockReplace).toHaveBeenCalledWith(
      Routes.RAMP.MODALS.PROVIDER_SELECTION,
      { amount: 250 },
    );
  });

  it('shows change provider instead of contact support when both flags are set', () => {
    mockUseParams.mockReturnValue({
      errorMessage: 'Error.',
      providerName: 'Transak',
      providerSupportUrl: 'https://support.transak.com',
      showChangeProvider: true,
    });

    const { getByText, queryByText } = renderWithProvider(ErrorDetailsModal);

    expect(getByText('Change provider')).toBeOnTheScreen();
    expect(queryByText(/Contact.*support/u)).not.toBeOnTheScreen();
  });
});
