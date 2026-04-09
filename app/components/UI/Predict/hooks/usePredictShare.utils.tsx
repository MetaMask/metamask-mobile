import React from 'react';
import { Box, IconSize } from '@metamask/design-system-react-native';
import Icon, {
  IconName,
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
  customBottomOffset: -50,
  startAccessory: (
    <Box twClassName="items-center justify-center pr-3">
      <Icon
        name={IconName.Confirmation}
        color={successColor}
        size={IconSize.Lg}
      />
    </Box>
  ),
});
