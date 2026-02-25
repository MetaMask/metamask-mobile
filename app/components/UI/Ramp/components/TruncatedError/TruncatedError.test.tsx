import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TruncatedError from './TruncatedError';
import { createErrorDetailsModalNavDetails } from '../../Views/Modals/ErrorDetailsModal/ErrorDetailsModal';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('TruncatedError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('renders correctly and matches snapshot', () => {
      const { toJSON } = render(
        <TruncatedError error="This is a test error message" />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders with custom maxLines prop', () => {
      const { toJSON } = render(
        <TruncatedError error="This is a test error message" maxLines={3} />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders an empty error string', () => {
      const { toJSON } = render(<TruncatedError error="" />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Info icon visibility', () => {
    it('always renders the info icon', () => {
      const { getByLabelText } = render(<TruncatedError error="Short error" />);

      expect(getByLabelText('View error details')).toBeOnTheScreen();
    });

    it('displays the error text', () => {
      const shortError = 'Short error message';
      const { getByText } = render(<TruncatedError error={shortError} />);

      expect(getByText(shortError)).toBeOnTheScreen();
    });
  });

  describe('Info button interaction', () => {
    const errorMessage =
      'This is an error message that should navigate to the error details modal when the info icon is pressed.';

    it('navigates to error details modal when info icon is pressed', () => {
      const { getByLabelText } = render(
        <TruncatedError error={errorMessage} maxLines={2} />,
      );

      fireEvent.press(getByLabelText('View error details'));

      expect(mockNavigate).toHaveBeenCalledWith(
        ...createErrorDetailsModalNavDetails({
          errorMessage,
          providerName: undefined,
          providerSupportUrl: undefined,
        }),
      );
    });

    it('navigates with provider info when provided', () => {
      const { getByLabelText } = render(
        <TruncatedError
          error={errorMessage}
          maxLines={2}
          providerName="Transak"
          providerSupportUrl="https://support.transak.com"
        />,
      );

      fireEvent.press(getByLabelText('View error details'));

      expect(mockNavigate).toHaveBeenCalledWith(
        ...createErrorDetailsModalNavDetails({
          errorMessage,
          providerName: 'Transak',
          providerSupportUrl: 'https://support.transak.com',
        }),
      );
    });

    it('navigates with updated error when error prop changes', () => {
      const { getByLabelText, rerender } = render(
        <TruncatedError error={errorMessage} maxLines={2} />,
      );

      const updatedError =
        'Updated error message that should navigate to the error details modal with the new message.';

      rerender(<TruncatedError error={updatedError} maxLines={2} />);

      fireEvent.press(getByLabelText('View error details'));

      expect(mockNavigate).toHaveBeenCalledWith(
        ...createErrorDetailsModalNavDetails({
          errorMessage: updatedError,
          providerName: undefined,
          providerSupportUrl: undefined,
        }),
      );
    });
  });
});
