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
  errorText: string,
  maxLines: number,
) {
  const mockEvent = {
    nativeEvent: {
      lines: Array.from({ length: maxLines + 1 }, (_, i) => ({
        text: errorText.slice(i * 20, (i + 1) * 20),
        x: 0,
        y: i * 20,
        width: 100,
        height: 20,
      })),
    },
  };
  const textComponent = getByText(errorText);
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

  describe('Short error text', () => {
    it('does not render info icon for short error text', () => {
      const { queryByLabelText } = render(
        <TruncatedError error="Short error" />,
      );

      expect(queryByLabelText('View error details')).toBeNull();
    });

    it('displays the full error text when not truncated', () => {
      const shortError = 'Short error message';
      const { getByText } = render(<TruncatedError error={shortError} />);

      expect(getByText(shortError)).toBeOnTheScreen();
    });

    it('does not show info icon when line count equals maxLines', () => {
      const error = 'Fits within two lines';
      const { getByText, queryByLabelText } = render(
        <TruncatedError error={error} maxLines={2} />,
      );

      const mockEvent = {
        nativeEvent: {
          lines: [
            { text: error.slice(0, 10), x: 0, y: 0, width: 100, height: 20 },
            { text: error.slice(10), x: 0, y: 20, width: 80, height: 20 },
          ],
        },
      };
      const textComponent = getByText(error);
      act(() => {
        fireEvent(textComponent, 'onTextLayout', mockEvent);
      });

      expect(queryByLabelText('View error details')).toBeNull();
    });
  });

  describe('Long error text (truncated)', () => {
    const longError =
      'This is a very long error message that should be truncated when displayed because it exceeds the maximum number of lines allowed and will trigger the text layout event to detect truncation.';

    it('renders info icon when text is truncated', () => {
      const { getByText, getByLabelText, toJSON } = render(
        <TruncatedError error={longError} maxLines={2} />,
      );

      triggerTruncation(getByText, longError, 2);

      expect(getByLabelText('View error details')).toBeOnTheScreen();
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders info icon with maxLines=1 when truncated', () => {
      const { getByText, getByLabelText } = render(
        <TruncatedError error={longError} maxLines={1} />,
      );

      triggerTruncation(getByText, longError, 1);

      expect(getByLabelText('View error details')).toBeOnTheScreen();
    });
  });

  describe('Info button interaction', () => {
    const longError =
      'This is a very long error message that should be truncated and the info icon should navigate to the error details modal when pressed.';

    it('navigates to error details modal when info icon is pressed', () => {
      const { getByText, getByLabelText } = render(
        <TruncatedError error={longError} maxLines={2} />,
      );

      triggerTruncation(getByText, longError, 2);

      fireEvent.press(getByLabelText('View error details'));

      expect(mockNavigate).toHaveBeenCalledWith(
        ...createErrorDetailsModalNavDetails({ errorMessage: longError }),
      );
    });

    it('navigates with updated error when error prop changes', () => {
      const { getByText, getByLabelText, rerender } = render(
        <TruncatedError error={longError} maxLines={2} />,
      );

      triggerTruncation(getByText, longError, 2);

      const updatedError =
        'Updated error message that is also long enough to be truncated and should navigate to the error details modal with the new message.';

      rerender(<TruncatedError error={updatedError} maxLines={2} />);

      triggerTruncation(getByText, updatedError, 2);

      fireEvent.press(getByLabelText('View error details'));

      expect(mockNavigate).toHaveBeenCalledWith(
        ...createErrorDetailsModalNavDetails({ errorMessage: updatedError }),
      );
    });
  });
});
