import {
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  IconName,
} from '@metamask/design-system-react-native';
import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { ConversationControlsTestIds } from './ConversationControls.testIds';

export interface ConversationControlsProps {
  /**
   * Clears only the current conversation and its saved quote state.
   * API credentials must remain outside this callback.
   */
  onStartNewConversation: () => void | Promise<void>;
  onStartNewConversationError?: (error: unknown) => void;
  /**
   * Avoids presenting a destructive confirmation when there is no conversation
   * to replace.
   */
  hasConversation?: boolean;
  disabled?: boolean;
  testID?: string;
}

const ACTION_HIT_SLOP = 8;

export const confirmStartNewConversation = ({
  hasConversation,
  onConfirm,
}: {
  hasConversation: boolean;
  onConfirm: () => void;
}) => {
  if (!hasConversation) {
    onConfirm();
    return;
  }

  Alert.alert(
    'Start a new conversation?',
    'This clears this conversation and its saved swap activity. Your OpenAI API key stays securely saved.',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Start new',
        style: 'destructive',
        onPress: onConfirm,
      },
    ],
  );
};

const ConversationControls = ({
  onStartNewConversation,
  onStartNewConversationError,
  hasConversation = true,
  disabled = false,
  testID = ConversationControlsTestIds.NEW_CONVERSATION_BUTTON,
}: ConversationControlsProps) => {
  const [isStarting, setIsStarting] = useState(false);
  const isDisabled = disabled || isStarting;

  const startNewConversation = useCallback(async () => {
    if (isDisabled) {
      return;
    }

    setIsStarting(true);
    try {
      await onStartNewConversation();
    } catch (error) {
      onStartNewConversationError?.(error);
    } finally {
      setIsStarting(false);
    }
  }, [isDisabled, onStartNewConversation, onStartNewConversationError]);

  const handlePress = useCallback(() => {
    if (isDisabled) {
      return;
    }

    confirmStartNewConversation({
      hasConversation,
      onConfirm: () => {
        startNewConversation().catch(() => undefined);
      },
    });
  }, [hasConversation, isDisabled, startNewConversation]);

  return (
    <ButtonIcon
      iconName={IconName.Edit}
      size={ButtonIconSize.Md}
      variant={ButtonIconVariant.Floating}
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityLabel={
        isStarting ? 'Starting new conversation' : 'Start new conversation'
      }
      accessibilityHint={
        hasConversation
          ? 'Asks for confirmation before clearing the current conversation'
          : 'Starts a new Wallet Assistant conversation'
      }
      accessibilityRole="button"
      accessibilityState={{ busy: isStarting, disabled: isDisabled }}
      hitSlop={ACTION_HIT_SLOP}
      testID={testID}
    />
  );
};

export default ConversationControls;
