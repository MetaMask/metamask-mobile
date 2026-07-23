import React from 'react';
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast';
import type { ToastOptions } from '../../../../component-library/components/Toast/Toast.types';

interface BuildShareCopiedToastOptionsParams {
  label: string;
  successColor: string;
}

/**
 * Builds the ToastOptions payload for the "copied to clipboard" share feedback.
 * Kept in a separate file so that the `usePredictShare` hook itself is JSX-free.
 */
export const buildShareCopiedToastOptions = ({
  label,
  successColor,
}: BuildShareCopiedToastOptionsParams): ToastOptions => ({
  variant: ToastVariants.Icon,
  labelOptions: [{ label, isBold: true }],
  iconName: IconName.Confirmation,
  backgroundColor: 'transparent',
  iconColor: successColor,
  hasNoTimeout: false,
  startAccessory: (
    <Icon
      name={IconName.Confirmation}
      color={successColor}
      size={IconSize.Lg}
    />
  ),
});
