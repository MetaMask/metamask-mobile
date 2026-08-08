import Clipboard from '@react-native-clipboard/clipboard';
import { IconName } from '@metamask/design-system-react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import AssistantResponseActions from './AssistantResponseActions';
import { AssistantResponseActionsTestIds } from './AssistantResponseActions.testIds';

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));

describe('AssistantResponseActions', () => {
  const mockClipboard = jest.mocked(Clipboard);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('copies response text and displays temporary copied feedback', () => {
    jest.useFakeTimers();
    render(
      <AssistantResponseActions
        responseText="A useful response"
        copiedFeedbackDurationMs={1000}
      />,
    );

    fireEvent.press(
      screen.getByTestId(AssistantResponseActionsTestIds.COPY_BUTTON),
    );

    expect(mockClipboard.setString).toHaveBeenCalledWith('A useful response');
    expect(
      screen.getByTestId(AssistantResponseActionsTestIds.COPIED_LABEL),
    ).toBeOnTheScreen();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(
      screen.queryByTestId(AssistantResponseActionsTestIds.COPIED_LABEL),
    ).not.toBeOnTheScreen();
  });

  it('invokes copy and retry callbacks from their actions', () => {
    const onCopy = jest.fn();
    const onRetry = jest.fn();
    render(
      <AssistantResponseActions
        responseText="Response"
        onCopy={onCopy}
        onRetry={onRetry}
      />,
    );

    fireEvent.press(
      screen.getByTestId(AssistantResponseActionsTestIds.COPY_BUTTON),
    );
    fireEvent.press(
      screen.getByTestId(AssistantResponseActionsTestIds.RETRY_BUTTON),
    );

    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('selects helpful feedback when uncontrolled', () => {
    const onThumbUp = jest.fn();
    render(
      <AssistantResponseActions
        responseText="Response"
        onThumbUp={onThumbUp}
      />,
    );
    const helpfulButton = screen.getByTestId(
      AssistantResponseActionsTestIds.THUMBS_UP_BUTTON,
    );

    fireEvent.press(helpfulButton);

    expect(onThumbUp).toHaveBeenCalledTimes(1);
    expect(helpfulButton.props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
    expect(
      screen.UNSAFE_getByProps({ name: IconName.ThumbUpFilled }),
    ).toBeTruthy();
  });

  it('renders controlled unhelpful feedback as selected', () => {
    const onThumbDown = jest.fn();
    render(
      <AssistantResponseActions
        responseText="Response"
        selectedFeedback="down"
        onThumbDown={onThumbDown}
      />,
    );

    const unhelpfulButton = screen.getByTestId(
      AssistantResponseActionsTestIds.THUMBS_DOWN_BUTTON,
    );

    expect(unhelpfulButton.props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
    expect(
      screen.UNSAFE_getByProps({ name: IconName.ThumbDownFilled }),
    ).toBeTruthy();
  });

  it('omits optional actions when callbacks are absent', () => {
    render(<AssistantResponseActions responseText="Response" />);

    const retryButton = screen.queryByTestId(
      AssistantResponseActionsTestIds.RETRY_BUTTON,
    );
    const helpfulButton = screen.queryByTestId(
      AssistantResponseActionsTestIds.THUMBS_UP_BUTTON,
    );
    const unhelpfulButton = screen.queryByTestId(
      AssistantResponseActionsTestIds.THUMBS_DOWN_BUTTON,
    );

    expect(retryButton).not.toBeOnTheScreen();
    expect(helpfulButton).not.toBeOnTheScreen();
    expect(unhelpfulButton).not.toBeOnTheScreen();
  });
});
