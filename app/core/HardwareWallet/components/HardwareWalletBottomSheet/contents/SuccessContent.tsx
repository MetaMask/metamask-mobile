import React, { useEffect } from 'react';

import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';

import { strings } from '../../../../../../locales/i18n';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { getHardwareWalletTypeName } from '../../../helpers';
import { ContentLayout } from './ContentLayout';

export const SUCCESS_CONTENT_TEST_ID = 'success-content';
export const SUCCESS_CONTENT_ICON_TEST_ID = 'success-content-icon';

export interface SuccessContentProps {
  /** The device type for context in messages */
  deviceType: HardwareWalletType;
  /** Callback when auto-dismiss triggers */
  onDismiss?: () => void;
  /** Auto-dismiss after this many milliseconds (0 to disable) */
  autoDismissMs?: number;
}

/**
 * Content component for displaying success feedback.
 * Auto-dismisses after the specified timeout.
 */
export const SuccessContent: React.FC<SuccessContentProps> = ({
  deviceType,
  onDismiss,
  autoDismissMs = 0,
}) => {
  useEffect(() => {
    if (autoDismissMs > 0 && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, autoDismissMs);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoDismissMs, onDismiss]);

  return (
    <ContentLayout
      testID={SUCCESS_CONTENT_TEST_ID}
      icon={
        <Icon
          testID={SUCCESS_CONTENT_ICON_TEST_ID}
          name={IconName.CheckBold}
          size={IconSize.Xl}
          color={IconColor.Success}
        />
      }
      title={strings('hardware_wallet.success.title', {
        device: getHardwareWalletTypeName(deviceType),
      })}
    />
  );
};
