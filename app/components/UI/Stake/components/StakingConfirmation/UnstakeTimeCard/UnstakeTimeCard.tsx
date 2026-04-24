import React from 'react';
import {
  ButtonIconSize,
  FontWeight,
  IconName,
  KeyValueRow,
  TextVariant,
} from '@metamask/design-system-react-native';
import Card from '../../../../../../component-library/components/Cards/Card';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './UnstakeTimeCard.styles';
import { strings } from '../../../../../../../locales/i18n';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { createTooltipOpenedEvent } from '../../../utils/metaMetrics/tooltipMetaMetricsUtils';
import useTooltipModal from '../../../../../hooks/useTooltipModal';

const UnstakingTimeCard = () => {
  const { styles } = useStyles(styleSheet, {});

  const { trackEvent } = useAnalytics();
  const { openTooltipModal } = useTooltipModal();

  const unstakingTimeTitle = strings('tooltip_modal.unstaking_time.title');

  return (
    <Card style={styles.card} disabled>
      <KeyValueRow
        keyLabel={unstakingTimeTitle}
        value={strings('stake.estimated_unstaking_time')}
        valueTextProps={{
          variant: TextVariant.BodyMd,
          fontWeight: FontWeight.Regular,
        }}
        keyEndButtonIconProps={{
          size: ButtonIconSize.Sm,
          iconName: IconName.Question,
          accessibilityRole: 'button',
          accessibilityLabel: `${unstakingTimeTitle} tooltip`,
          onPress: () => {
            openTooltipModal(
              unstakingTimeTitle,
              strings('tooltip_modal.unstaking_time.tooltip'),
            );
            trackEvent(
              createTooltipOpenedEvent('Unstaking Time Card', 'Unstaking Time'),
            );
          },
        }}
      />
    </Card>
  );
};

export default UnstakingTimeCard;
