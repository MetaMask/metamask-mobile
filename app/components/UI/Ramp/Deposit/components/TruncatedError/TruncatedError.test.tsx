import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import TruncatedError from './TruncatedError';
import { createErrorDetailsModalNavigationDetails } from '../../Views/Modals/ErrorDetailsModal/ErrorDetailsModal';

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
  });

  describe('Short error text', () => {
    it('does not render "See more" button for short error text', () => {
      const shortError = 'Short error';
      const { queryByText } = render(<TruncatedError error={shortError} />);

      expect(queryByText('See more')).toBeNull();
    });

    it('displays the full error text when not truncated', () => {
      const shortError = 'Short error message';
      const { getByText } = render(<TruncatedError error={shortError} />);

      expect(getByText(shortError)).toBeTruthy();
    });
  });

  describe('Long error text', () => {
    it('renders "See more" button for long error text that gets truncated', () => {
      const longError =
        'This is a very long error message that should be truncated when displayed in the banner alert component because it exceeds the maximum number of lines allowed and will trigger the text layout event to detect truncation. A bit more text to ensure truncation occurs.';

      const mockEvent = {
        nativeEvent: {
          lines: [
            {
              text: longError.slice(0, 20),
              x: 0,
              y: 0,
              width: 100,
              height: 20,
            },
            { text: longError.slice(20), x: 0, y: 20, width: 80, height: 20 },
          ],
        },
      };
      const { queryByText, getByText, toJSON } = render(
        <TruncatedError error={longError} maxLines={2} />,
      );
      const textComponent = getByText(longError);
      act(() => {
        fireEvent(textComponent, 'onTextLayout', mockEvent);
      });

      expect(toJSON()).toMatchSnapshot();
      expect(queryByText('See more')).toBeDefined();
    });
  });

  describe('See More button interaction', () => {
    it('renders "See more" button for long error text that gets truncated', () => {
      const longError =
        'This is a very long error message that should be truncated when displayed in the banner alert component because it exceeds the maximum number of lines allowed and will trigger the text layout event to detect truncation. A bit more text to ensure truncation occurs.';

      const mockEvent = {
        nativeEvent: {
          lines: [
            {
              text: longError.slice(0, 20),
              x: 0,
              y: 0,
              width: 100,
              height: 20,
            },
            { text: longError.slice(20), x: 0, y: 20, width: 80, height: 20 },
          ],
        },
      };
      const { queryByText, getByText } = render(
        <TruncatedError error={longError} maxLines={2} />,
      );
      const textComponent = getByText(longError);
      act(() => {
        fireEvent(textComponent, 'onTextLayout', mockEvent);
      });

      const seeMoreButton = queryByText('See more');
      if (!seeMoreButton) {
        throw new Error('See more button not found');
      }
      fireEvent.press(seeMoreButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        ...createErrorDetailsModalNavigationDetails({
          errorMessage: longError,
        }),
      );
    });
  });
});
