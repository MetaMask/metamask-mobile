import React from 'react';
import KeyValueRow, {
  TooltipSizes,
} from '../../../../../../component-library/components-temp/KeyValueRow';
import Card from '../../../../../../component-library/components/Cards/Card';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './UnstakeTimeCard.styles';
import { TextVariant } from '../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../locales/i18n';

const UnstakingTimeCard = () => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Card style={styles.card} disabled>
      <KeyValueRow
        field={{
          label: { text: strings('tooltip_modal.unstaking_time.title') },
          tooltip: {
            title: strings('tooltip_modal.unstaking_time.title'),
            text: strings('tooltip_modal.unstaking_time.tooltip'),
            size: TooltipSizes.Sm,
          },
        }}
        value={{
          label: {
            text: `${strings('stake.up_to_n', { count: 11 })} ${strings(
              'stake.day',
              { count: 11 },
            )}`,
            variant: TextVariant.BodyMD,
          },
        }}
      />
    </Card>
  );
};

export default UnstakingTimeCard;
