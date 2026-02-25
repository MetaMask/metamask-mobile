import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import TruncatedError from './TruncatedError';
import { createErrorDetailsModalNavDetails } from '../../Views/Modals/ErrorDetailsModal/ErrorDetailsModal';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

function triggerTruncation(
  getByText: ReturnType<typeof render>['getByText'],
  displayedText: string,
  fullError: string,
) {
  const truncatedText = fullError.slice(0, 20);
  const mockEvent = {
    nativeEvent: {
      lines: [{ text: truncatedText, x: 0, y: 0, width: 100, height: 20 }],
    },
  };
  const textComponent = getByText(displayedText);
  act(() => {
    fireEvent(textComponent, 'onTextLayout', mockEvent);
  });
}

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

    it('displays the error text when not truncated', () => {
      const shortError = 'Short error message';
      const { getByText } = render(<TruncatedError error={shortError} />);

      expect(getByText(shortError)).toBeOnTheScreen();
    });
  });

  describe('Truncation behavior', () => {
    const longError =
      'This is a very long error message that should be truncated when displayed because it exceeds the maximum number of lines allowed.';

    it('shows fallback text when error is truncated', () => {
      const { getByText, toJSON } = render(
        <TruncatedError error={longError} />,
      );

      triggerTruncation(getByText, longError, longError);

      expect(getByText("We've encountered an error")).toBeOnTheScreen();
      expect(toJSON()).toMatchSnapshot();
    });

    it('still navigates with the full error message when truncated', () => {
      const { getByText, getByLabelText } = render(
        <TruncatedError
          error={longError}
          providerName="Transak"
          providerSupportUrl="https://support.transak.com"
        />,
      );

      triggerTruncation(getByText, longError, longError);

      fireEvent.press(getByLabelText('View error details'));

      expect(mockNavigate).toHaveBeenCalledWith(
        ...createErrorDetailsModalNavDetails({
          errorMessage: longError,
          providerName: 'Transak',
          providerSupportUrl: 'https://support.transak.com',
          showChangeProvider: undefined,
        }),
      );
    });
  });

  describe('Info button interaction', () => {
    const errorMessage = 'Short error';

    it('navigates to error details modal when info icon is pressed', () => {
      const { getByLabelText } = render(
        <TruncatedError error={errorMessage} />,
      );

      fireEvent.press(getByLabelText('View error details'));

      expect(mockNavigate).toHaveBeenCalledWith(
        ...createErrorDetailsModalNavDetails({
          errorMessage,
          providerName: undefined,
          providerSupportUrl: undefined,
          showChangeProvider: undefined,
        }),
      );
    });

    it('navigates with provider info when provided', () => {
      const { getByLabelText } = render(
        <TruncatedError
          error={errorMessage}
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
          showChangeProvider: undefined,
        }),
      );
    });

    it('passes showChangeProvider to navigation params', () => {
      const { getByLabelText } = render(
        <TruncatedError error={errorMessage} showChangeProvider />,
      );

      fireEvent.press(getByLabelText('View error details'));

      expect(mockNavigate).toHaveBeenCalledWith(
        ...createErrorDetailsModalNavDetails({
          errorMessage,
          providerName: undefined,
          providerSupportUrl: undefined,
          showChangeProvider: true,
        }),
      );
    });

    it('sends errorDetails to the modal instead of error when provided', () => {
      const detailedMessage = 'Full details about the error for the modal.';
      const { getByLabelText } = render(
        <TruncatedError
          error={errorMessage}
          errorDetails={detailedMessage}
          showChangeProvider
        />,
      );

      fireEvent.press(getByLabelText('View error details'));

      expect(mockNavigate).toHaveBeenCalledWith(
        ...createErrorDetailsModalNavDetails({
          errorMessage: detailedMessage,
          providerName: undefined,
          providerSupportUrl: undefined,
          showChangeProvider: true,
        }),
      );
    });
  });
});
