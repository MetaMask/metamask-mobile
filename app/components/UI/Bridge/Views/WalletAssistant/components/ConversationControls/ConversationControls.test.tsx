import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import React from 'react';
import { Alert, type AlertButton } from 'react-native';

import ConversationControls from './ConversationControls';
import { ConversationControlsTestIds } from './ConversationControls.testIds';

describe('ConversationControls', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert');
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('asks for confirmation before replacing an existing conversation', () => {
    render(<ConversationControls onStartNewConversation={jest.fn()} />);

    fireEvent.press(
      screen.getByTestId(ConversationControlsTestIds.NEW_CONVERSATION_BUTTON),
    );

    expect(alertSpy).toHaveBeenCalledWith(
      'Start a new conversation?',
      expect.stringContaining('Your OpenAI API key stays securely saved.'),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({
          text: 'Start new',
          style: 'destructive',
        }),
      ]),
    );
  });

  it('does not clear the conversation when confirmation is cancelled', () => {
    const onStartNewConversation = jest.fn();
    render(
      <ConversationControls onStartNewConversation={onStartNewConversation} />,
    );

    fireEvent.press(
      screen.getByTestId(ConversationControlsTestIds.NEW_CONVERSATION_BUTTON),
    );
    const buttons = alertSpy.mock.calls[0][2] as AlertButton[] | undefined;
    buttons?.find((button) => button.style === 'cancel')?.onPress?.();

    expect(onStartNewConversation).not.toHaveBeenCalled();
  });

  it('starts a new conversation after explicit confirmation', async () => {
    const onStartNewConversation = jest.fn().mockResolvedValue(undefined);
    render(
      <ConversationControls onStartNewConversation={onStartNewConversation} />,
    );

    fireEvent.press(
      screen.getByTestId(ConversationControlsTestIds.NEW_CONVERSATION_BUTTON),
    );
    const buttons = alertSpy.mock.calls[0][2] as AlertButton[] | undefined;
    await act(async () => {
      buttons?.find((button) => button.style === 'destructive')?.onPress?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(onStartNewConversation).toHaveBeenCalledTimes(1);
    });
  });

  it('starts immediately when there is no conversation to replace', async () => {
    const onStartNewConversation = jest.fn().mockResolvedValue(undefined);
    render(
      <ConversationControls
        hasConversation={false}
        onStartNewConversation={onStartNewConversation}
      />,
    );

    fireEvent.press(
      screen.getByTestId(ConversationControlsTestIds.NEW_CONVERSATION_BUTTON),
    );

    await waitFor(() => {
      expect(onStartNewConversation).toHaveBeenCalledTimes(1);
    });
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('exposes a compact accessible button and respects disabled state', () => {
    const onStartNewConversation = jest.fn();
    render(
      <ConversationControls
        disabled
        onStartNewConversation={onStartNewConversation}
      />,
    );

    const button = screen.getByTestId(
      ConversationControlsTestIds.NEW_CONVERSATION_BUTTON,
    );

    expect(button.props.accessibilityLabel).toBe('Start new conversation');
    expect(button.props.accessibilityState).toEqual(
      expect.objectContaining({ busy: false, disabled: true }),
    );
    fireEvent.press(button);
    expect(alertSpy).not.toHaveBeenCalled();
    expect(onStartNewConversation).not.toHaveBeenCalled();
  });

  it('reports a conversation reset failure without leaving the button busy', async () => {
    const error = new Error('Storage unavailable');
    const onStartNewConversationError = jest.fn();
    render(
      <ConversationControls
        hasConversation={false}
        onStartNewConversation={jest.fn().mockRejectedValue(error)}
        onStartNewConversationError={onStartNewConversationError}
      />,
    );

    const button = screen.getByTestId(
      ConversationControlsTestIds.NEW_CONVERSATION_BUTTON,
    );
    fireEvent.press(button);

    await waitFor(() => {
      expect(onStartNewConversationError).toHaveBeenCalledWith(error);
      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({ busy: false, disabled: false }),
      );
    });
  });
});
