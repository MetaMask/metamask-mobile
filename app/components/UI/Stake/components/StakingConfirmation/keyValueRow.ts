import { useCallback } from 'react';
import {
  ButtonIconSize,
  FontWeight,
  IconName,
  TextColor,
} from '@metamask/design-system-react-native';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import useTooltipModal from '../../../../hooks/useTooltipModal';
import { createTooltipOpenedEvent } from '../../utils/metaMetrics/tooltipMetaMetricsUtils';

/**
 * The design system row hard-codes horizontal padding, a fixed height and no
 * overflow. The confirmation cards supply their own padding and size to their
 * content, so each row opts back out.
 */
export const KEY_VALUE_ROW_CLASSNAME = 'h-auto px-0 overflow-hidden';

export const KEY_VALUE_ROW_KEY_TEXT_PROPS = {
  color: TextColor.TextDefault,
};

export const KEY_VALUE_ROW_VALUE_TEXT_PROPS = {
  fontWeight: FontWeight.Regular,
};

/**
 * Builds the `keyEndButtonIconProps` for a row whose label carries a tooltip,
 * opening the tooltip modal and reporting it to analytics.
 *
 * The design system row exposes the button rather than a tooltip, so the
 * wiring lives here to keep it identical across the confirmation cards.
 */
export const useKeyValueRowTooltip = () => {
  const { openTooltipModal } = useTooltipModal();
  const { trackEvent } = useAnalytics();

  return useCallback(
    (
      title: string,
      content: string,
      location: string,
      tooltipName: string,
    ) => ({
      size: ButtonIconSize.Xs,
      iconName: IconName.Question,
      accessibilityRole: 'button' as const,
      accessibilityLabel: `${title} tooltip`,
      onPress: () => {
        openTooltipModal(title, content);
        trackEvent(createTooltipOpenedEvent(location, tooltipName));
      },
    }),
    [openTooltipModal, trackEvent],
  );
};
