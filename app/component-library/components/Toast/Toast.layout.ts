import {
  ButtonIconVariant,
  ToastCloseButtonOptions,
  ToastOptions,
} from './Toast.types';

export const hasToastDescription = (
  options: ToastOptions | undefined,
): boolean => {
  if (!options) {
    return false;
  }

  if (options.descriptionOptions?.description) {
    return true;
  }

  const descriptionSplitIndex = options.labelOptions.findIndex(
    (option, index) => index > 0 && option.label === '\n',
  );

  return (
    descriptionSplitIndex !== -1 &&
    options.labelOptions.slice(descriptionSplitIndex + 1).length > 0
  );
};

export const shouldTopAlignToastContent = ({
  titleLineCount,
  hasDescription,
  descriptionLineCount,
  hasActionButton,
  hasTrailingTextButton,
}: {
  titleLineCount: number | null;
  hasDescription: boolean;
  descriptionLineCount: number | null;
  hasActionButton: boolean;
  hasTrailingTextButton: boolean;
}): boolean => {
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

export const hasTrailingTextButton = (
  closeButtonOptions: ToastCloseButtonOptions | undefined,
): boolean =>
  closeButtonOptions != null &&
  closeButtonOptions.variant !== ButtonIconVariant.Icon;
