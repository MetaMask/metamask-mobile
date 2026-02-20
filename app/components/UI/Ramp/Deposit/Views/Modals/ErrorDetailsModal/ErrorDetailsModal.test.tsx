import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import ErrorDetailsModal from './ErrorDetailsModal';

const mockOnCloseBottomSheet = jest.fn();

jest.mock(
  '../../../../../../../component-library/components/BottomSheets/BottomSheet',
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
jest.mock('../../../../../../../util/navigation/navUtils', () => ({
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

  it('closes the modal when the close button is pressed', () => {
    const { getByTestId } = renderWithProvider(ErrorDetailsModal);
    const closeButton = getByTestId('error-details-close-button');

    fireEvent.press(closeButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});
