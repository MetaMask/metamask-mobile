import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import ErrorDetailsModal from './ErrorDetailsModal';

const mockOnCloseBottomSheet = jest.fn();

jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    return ReactActual.forwardRef(
      (
        { children }: { children: React.ReactNode },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockOnCloseBottomSheet,
        }));
        return <>{children}</>;
      },
    );
  },
);

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

  it('renders correctly and matches snapshot', () => {
    const { toJSON } = renderWithProvider(ErrorDetailsModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with a multiline error message', () => {
    mockUseParams.mockReturnValue({
      errorMessage:
        'Error on line 1.\nError on line 2.\nAdditional context for debugging.',
    });

    const { toJSON } = renderWithProvider(ErrorDetailsModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with an empty error message', () => {
    mockUseParams.mockReturnValue({
      errorMessage: '',
    });

    const { toJSON } = renderWithProvider(ErrorDetailsModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with provider support info and matches snapshot', () => {
    mockUseParams.mockReturnValue({
      errorMessage: 'Provider error occurred.',
      providerName: 'Transak',
      providerSupportUrl: 'https://support.transak.com',
    });

    const { toJSON } = renderWithProvider(ErrorDetailsModal);
    expect(toJSON()).toMatchSnapshot();
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

  it('opens support URL when Contact provider support is pressed', () => {
    mockUseParams.mockReturnValue({
      errorMessage: 'Provider error occurred.',
      providerName: 'Transak',
      providerSupportUrl: 'https://support.transak.com',
    });

    const { getByText } = renderWithProvider(ErrorDetailsModal);

    fireEvent.press(getByText('Contact Transak support'));

    expect(Linking.openURL).toHaveBeenCalledWith('https://support.transak.com');
  });

  it('does not render contact support button when provider info is missing', () => {
    const { queryByText } = renderWithProvider(ErrorDetailsModal);

    expect(queryByText(/Contact.*support/u)).toBeNull();
  });
});
