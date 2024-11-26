import React from 'react';
import KeyValueRow, {
  TooltipSizes,
} from '../../../../../../component-library/components-temp/KeyValueRow';
import Card from '../../../../../../component-library/components/Cards/Card';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './UnstakeTimeCard.styles';
import { TextVariant } from '../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../locales/i18n';
import { useMetrics } from '../../../../../hooks/useMetrics';
import { createTooltipOpenedEvent } from '../../../utils/metaMetrics/tooltipMetaMetricsUtils';

const UnstakingTimeCard = () => {
  const { styles } = useStyles(styleSheet, {});

  const { trackEvent } = useMetrics();

  return (
    <Card style={styles.card} disabled>
      <KeyValueRow
        field={{
          label: { text: strings('tooltip_modal.unstaking_time.title') },
          tooltip: {
            title: strings('tooltip_modal.unstaking_time.title'),
            content: strings('tooltip_modal.unstaking_time.tooltip'),
            size: TooltipSizes.Sm,
            onPress: () =>
              trackEvent(
                createTooltipOpenedEvent(
                  'Unstaking Time Card',
                  'Unstaking Time',
                ),
              ),
          },
        }}
        value={{
          label: {
            text: strings('stake.estimated_unstaking_time'),
            variant: TextVariant.BodyMD,
          },
        }}
      />
    </Card>
  );
};

export default UnstakingTimeCard;
