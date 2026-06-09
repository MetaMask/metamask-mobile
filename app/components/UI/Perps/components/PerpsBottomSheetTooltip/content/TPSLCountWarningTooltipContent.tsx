import React from 'react';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { View } from 'react-native';
import { useStyles } from '../../../../../hooks/useStyles';
import { strings } from '../../../../../../../locales/i18n';
import { TooltipContentProps } from './types';
import createStyles from './FeesTooltipContent.styles';

interface TPSLCountWarningTooltipContentProps extends TooltipContentProps {
  data?: {
    metamaskFeeRate?: number;
    protocolFeeRate?: number;
  };
}

const TPSLCountWarningTooltipContent = ({
  testID,
}: TPSLCountWarningTooltipContentProps) => {
  const { styles } = useStyles(createStyles, {});

  return (
    <View testID={testID}>
      <View style={styles.feeRow}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('perps.tooltips.tpsl_count_warning.content')}
        </Text>
      </View>
    </View>
  );
};

export default TPSLCountWarningTooltipContent;
