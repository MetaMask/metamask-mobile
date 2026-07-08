interface ShouldTopAlignNotificationContentParams {
  titleLineCount: number | null;
  hasDescription: boolean;
  descriptionLineCount: number | null;
  hasActionButton: boolean;
  hasTrailingTextButton: boolean;
}

export const shouldTopAlignNotificationContent = ({
  titleLineCount,
  hasDescription,
  descriptionLineCount,
  hasActionButton,
  hasTrailingTextButton,
}: ShouldTopAlignNotificationContentParams): boolean => {
  if (hasTrailingTextButton) {
    return false;
  }

  if (titleLineCount !== null && titleLineCount > 1 && hasDescription) {
    return true;
  }

  if (!hasDescription) {
    return false;
  }

  if (descriptionLineCount === null) {
    return hasActionButton;
  }

  if (descriptionLineCount > 1) {
    return true;
  }

  return descriptionLineCount === 1 && hasActionButton;
};
