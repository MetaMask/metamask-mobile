import React from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import type { UiSlot } from '../../../../core/Engine/controllers/ui-slots-controller/types';
import { executeUiSlotAction } from '../mobileActionRegistry';

const BANNER_SEVERITY = {
  neutral: BannerAlertSeverity.Neutral,
  info: BannerAlertSeverity.Info,
  success: BannerAlertSeverity.Success,
  warning: BannerAlertSeverity.Warning,
  danger: BannerAlertSeverity.Danger,
};

export function AlertBannerWidget({ slot }: { slot: UiSlot }) {
  if (slot.widget.type !== 'alert-banner') {
    return null;
  }

  const dismissAction = slot.actions?.find(
    (action) => action.actionId === 'dismiss',
  );

  return (
    <BannerAlert
      severity={BANNER_SEVERITY[slot.widget.props.tone]}
      title={slot.widget.props.title}
      description={slot.widget.props.description}
      onClose={
        dismissAction
          ? () => executeUiSlotAction(slot, dismissAction)
          : undefined
      }
      closeButtonProps={{
        testID: `ui-slot-alert-banner-close-${slot.contentId}`,
      }}
      testID={`ui-slot-alert-banner-${slot.contentId}`}
    />
  );
}
