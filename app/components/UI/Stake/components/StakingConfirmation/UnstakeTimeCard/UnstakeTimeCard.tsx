import React from 'react';
import {
  ButtonIconSize,
  Card,
  FontWeight,
  IconName,
  KeyValueRow,
  TextColor,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './UnstakeTimeCard.styles';
import { strings } from '../../../../../../../locales/i18n';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import useTooltipModal from '../../../../../hooks/useTooltipModal';
import { createTooltipOpenedEvent } from '../../../utils/metaMetrics/tooltipMetaMetricsUtils';

const KEY_VALUE_ROW_CLASSNAME = 'h-auto px-0 overflow-hidden';

const KEY_VALUE_ROW_KEY_TEXT_PROPS = {
  color: TextColor.TextDefault,
};

const KEY_VALUE_ROW_VALUE_TEXT_PROPS = {
  fontWeight: FontWeight.Regular,
};

const UnstakingTimeCard = () => {
  const { styles } = useStyles(styleSheet, {});

  const { trackEvent } = useAnalytics();

  const { openTooltipModal } = useTooltipModal();

  return (
    <Card accessible style={styles.card}>
      <KeyValueRow
        twClassName={KEY_VALUE_ROW_CLASSNAME}
        keyLabel={strings('tooltip_modal.unstaking_time.title')}
        keyTextProps={KEY_VALUE_ROW_KEY_TEXT_PROPS}
        keyEndButtonIconProps={{
          size: ButtonIconSize.Xs,
          iconName: IconName.Question,
          accessibilityRole: 'button',
          accessibilityLabel: `${strings(
            'tooltip_modal.unstaking_time.title',
          )} tooltip`,
          onPress: () => {
            openTooltipModal(
              strings('tooltip_modal.unstaking_time.title'),
              strings('tooltip_modal.unstaking_time.tooltip'),
            );
            trackEvent(
              createTooltipOpenedEvent('Unstaking Time Card', 'Unstaking Time'),
            );
          },
        }}
        value={strings('stake.estimated_unstaking_time')}
        valueTextProps={KEY_VALUE_ROW_VALUE_TEXT_PROPS}
      />
    </Card>
  );
};

export default UnstakingTimeCard;
