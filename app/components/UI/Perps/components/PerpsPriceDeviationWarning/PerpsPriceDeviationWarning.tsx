import React, { memo } from 'react';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { View } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import type { PerpsPriceDeviationWarningProps } from './PerpsPriceDeviationWarning.types';
import styleSheet from './PerpsPriceDeviationWarning.styles';

/**
 * Component that displays a warning when the perps price has deviated too much from the spot price
 * This prevents users from opening new positions when the price is significantly different from the spot price
 *
 * **Performance:**
 * - Memoized to prevent unnecessary re-renders
 *
 * @example
 * ```tsx
 * <PerpsPriceDeviationWarning />
 * ```
 */
const PerpsPriceDeviationWarning: React.FC<PerpsPriceDeviationWarningProps> =
  memo(({ testID = 'perps-price-deviation-warning' }) => {
    const { styles } = useStyles(styleSheet, {});

    return (
      <View style={styles.container} testID={testID}>
        <Icon
          name={IconName.Info}
          size={IconSize.Md}
          color={IconColor.IconDefault}
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {strings('perps.price_deviation_warning.message')}
          </Text>
        </View>
      </View>
    );
  });

PerpsPriceDeviationWarning.displayName = 'PerpsPriceDeviationWarning';

export default PerpsPriceDeviationWarning;
