import React from 'react';
import { Card, KeyValueRow } from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './UnstakeTimeCard.styles';
import { strings } from '../../../../../../../locales/i18n';
import {
  KEY_VALUE_ROW_CLASSNAME,
  KEY_VALUE_ROW_KEY_TEXT_PROPS,
  KEY_VALUE_ROW_VALUE_TEXT_PROPS,
  useKeyValueRowTooltip,
} from '../keyValueRow';

const UnstakingTimeCard = () => {
  const { styles } = useStyles(styleSheet, {});

  const tooltipProps = useKeyValueRowTooltip();

  return (
    <Card accessible style={styles.card}>
      <KeyValueRow
        twClassName={KEY_VALUE_ROW_CLASSNAME}
        keyLabel={strings('tooltip_modal.unstaking_time.title')}
        keyTextProps={KEY_VALUE_ROW_KEY_TEXT_PROPS}
        keyEndButtonIconProps={tooltipProps(
          strings('tooltip_modal.unstaking_time.title'),
          strings('tooltip_modal.unstaking_time.tooltip'),
          'Unstaking Time Card',
          'Unstaking Time',
        )}
        value={strings('stake.estimated_unstaking_time')}
        valueTextProps={KEY_VALUE_ROW_VALUE_TEXT_PROPS}
      />
    </Card>
  );
};

export default UnstakingTimeCard;
