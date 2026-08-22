import Clipboard from '@react-native-clipboard/clipboard';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AssistantResponseActionsTestIds } from './AssistantResponseActions.testIds';

export type AssistantResponseFeedback = 'up' | 'down';

export interface AssistantResponseActionsProps {
  /**
   * Plain-text representation of the response to copy.
   */
  responseText: string;
  /**
   * Optional callback for retrying the request that produced this response.
   */
  onRetry?: () => void;
  /**
   * Optional callbacks enable the corresponding feedback actions.
   */
  onThumbUp?: () => void;
  onThumbDown?: () => void;
  /**
   * Controlled feedback state. Omit to let the component manage selection.
   */
  selectedFeedback?: AssistantResponseFeedback | null;
  /**
   * Initial feedback state when the component is uncontrolled.
   */
  defaultSelectedFeedback?: AssistantResponseFeedback | null;
  /**
   * Optional analytics callback invoked after text is copied.
   */
  onCopy?: () => void;
  copiedFeedbackDurationMs?: number;
  testID?: string;
}

const DEFAULT_COPIED_FEEDBACK_DURATION_MS = 1500;
const ACTION_HIT_SLOP = 6;

const AssistantResponseActions = ({
  responseText,
  onRetry,
  onThumbUp,
  onThumbDown,
  selectedFeedback,
  defaultSelectedFeedback = null,
  onCopy,
  copiedFeedbackDurationMs = DEFAULT_COPIED_FEEDBACK_DURATION_MS,
  testID = AssistantResponseActionsTestIds.CONTAINER,
}: AssistantResponseActionsProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const [internalFeedback, setInternalFeedback] = useState(
    defaultSelectedFeedback,
  );
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeFeedback =
    selectedFeedback === undefined ? internalFeedback : selectedFeedback;

  const clearCopiedTimer = useCallback(() => {
    if (copiedTimerRef.current) {
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      clearCopiedTimer();
    },
    [clearCopiedTimer],
  );

  const handleCopy = useCallback(() => {
    Clipboard.setString(responseText);
    onCopy?.();
    setIsCopied(true);
    clearCopiedTimer();
    copiedTimerRef.current = setTimeout(() => {
      setIsCopied(false);
      copiedTimerRef.current = null;
    }, copiedFeedbackDurationMs);
  }, [clearCopiedTimer, copiedFeedbackDurationMs, onCopy, responseText]);

  const handleThumbUp = useCallback(() => {
    if (selectedFeedback === undefined) {
      setInternalFeedback('up');
    }
    onThumbUp?.();
  }, [onThumbUp, selectedFeedback]);

  const handleThumbDown = useCallback(() => {
    if (selectedFeedback === undefined) {
      setInternalFeedback('down');
    }
    onThumbDown?.();
  }, [onThumbDown, selectedFeedback]);

  const isThumbUpSelected = activeFeedback === 'up';
  const isThumbDownSelected = activeFeedback === 'down';

  return (
    <Box
      twClassName="flex-row items-center gap-1"
      testID={testID}
      accessibilityLabel="Response actions"
    >
      <ButtonIcon
        iconName={isCopied ? IconName.CopySuccess : IconName.Copy}
        size={ButtonIconSize.Sm}
        onPress={handleCopy}
        accessibilityLabel={isCopied ? 'Response copied' : 'Copy response'}
        accessibilityRole="button"
        hitSlop={ACTION_HIT_SLOP}
        testID={AssistantResponseActionsTestIds.COPY_BUTTON}
        iconProps={isCopied ? { color: IconColor.SuccessDefault } : undefined}
      />
      {isCopied && (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.SuccessDefault}
          accessibilityLiveRegion="polite"
          testID={AssistantResponseActionsTestIds.COPIED_LABEL}
        >
          Copied
        </Text>
      )}
      {onRetry && (
        <ButtonIcon
          iconName={IconName.Refresh}
          size={ButtonIconSize.Sm}
          onPress={onRetry}
          accessibilityLabel="Retry response"
          accessibilityRole="button"
          hitSlop={ACTION_HIT_SLOP}
          testID={AssistantResponseActionsTestIds.RETRY_BUTTON}
        />
      )}
      {onThumbUp && (
        <ButtonIcon
          iconName={
            isThumbUpSelected ? IconName.ThumbUpFilled : IconName.ThumbUp
          }
          size={ButtonIconSize.Sm}
          variant={
            isThumbUpSelected
              ? ButtonIconVariant.Filled
              : ButtonIconVariant.Default
          }
          onPress={handleThumbUp}
          accessibilityLabel={
            isThumbUpSelected
              ? 'Response marked helpful'
              : 'Mark response helpful'
          }
          accessibilityRole="button"
          accessibilityState={{ selected: isThumbUpSelected }}
          hitSlop={ACTION_HIT_SLOP}
          testID={AssistantResponseActionsTestIds.THUMBS_UP_BUTTON}
        />
      )}
      {onThumbDown && (
        <ButtonIcon
          iconName={
            isThumbDownSelected ? IconName.ThumbDownFilled : IconName.ThumbDown
          }
          size={ButtonIconSize.Sm}
          variant={
            isThumbDownSelected
              ? ButtonIconVariant.Filled
              : ButtonIconVariant.Default
          }
          onPress={handleThumbDown}
          accessibilityLabel={
            isThumbDownSelected
              ? 'Response marked unhelpful'
              : 'Mark response unhelpful'
          }
          accessibilityRole="button"
          accessibilityState={{ selected: isThumbDownSelected }}
          hitSlop={ACTION_HIT_SLOP}
          testID={AssistantResponseActionsTestIds.THUMBS_DOWN_BUTTON}
        />
      )}
    </Box>
  );
};

export default AssistantResponseActions;
