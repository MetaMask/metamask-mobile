import React from 'react';
import { StyleSheet, View } from 'react-native';
import Box from './Box';
import Feather from 'react-native-vector-icons/Feather';
import { strings } from '../../../../../locales/i18n';
import { TimeDescriptions, timeToDescription } from '../utils';
import { useTheme } from '../../../../util/theme';
import { Colors } from '../../../../util/theme/models';
import PaymentMethodBadges from './PaymentMethodBadges';
import { Payment } from '@consensys/on-ramp-sdk';
import PaymentMethodIcon from './PaymentMethodIcon';
import ListItem from '../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';

interface Props {
  payment: Payment;
  onPress?: () => void;
  highlighted?: boolean;
  compact?: boolean;
  isBuy: boolean;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    iconWrapper: {
      width: 38,
      height: 38,
      backgroundColor: colors.background.alternative,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    compactIconWrapper: {
      width: 32,
      height: 32,
      borderRadius: 4.8,
    },
    icon: {
      color: colors.icon.default,
    },
    cardIcons: {
      flexDirection: 'row',
    },
    cardIcon: {
      marginLeft: 6,
      width: 30,
      height: 20,
    },
    line: {
      backgroundColor: colors.border.muted,
      height: 1,
      marginVertical: 12,
    },
    compactLine: {
      height: 0,
      marginVertical: 6,
    },
    methodName: {
      marginBottom: 4,
    },
  });

const renderDescription = (description: TimeDescriptions | string) => {
  switch (description) {
    case TimeDescriptions.instant: {
      return strings('fiat_on_ramp_aggregator.payment_method.instant');
    }
    case TimeDescriptions.less_than: {
      return strings('fiat_on_ramp_aggregator.payment_method.less_than');
    }
    case TimeDescriptions.separator: {
      return '-';
    }
    case TimeDescriptions.minutes: {
      return strings('fiat_on_ramp_aggregator.payment_method.minutes');
    }
    case TimeDescriptions.minute: {
      return strings('fiat_on_ramp_aggregator.payment_method.minute');
    }
    case TimeDescriptions.hours: {
      return strings('fiat_on_ramp_aggregator.payment_method.hours');
    }
    case TimeDescriptions.hour: {
      return strings('fiat_on_ramp_aggregator.payment_method.hour');
    }
    case TimeDescriptions.business_days: {
      return strings('fiat_on_ramp_aggregator.payment_method.business_days');
    }
    case TimeDescriptions.business_day: {
      return strings('fiat_on_ramp_aggregator.payment_method.business_day');
    }
    default: {
      return description;
    }
  }
};
const renderTime = (time: number[]) =>
  timeToDescription(time).map(renderDescription).join(' ');

const tierDescriptions = [
  strings('fiat_on_ramp_aggregator.payment_method.lowest_limit'),
  strings('fiat_on_ramp_aggregator.payment_method.medium_limit'),
  strings('fiat_on_ramp_aggregator.payment_method.highest_limit'),
];
const sellTierDescriptions = [
  strings('fiat_on_ramp_aggregator.payment_method.lowest_sell_limit'),
  strings('fiat_on_ramp_aggregator.payment_method.medium_sell_limit'),
  strings('fiat_on_ramp_aggregator.payment_method.highest_sell_limit'),
];
const renderTiers = (tiers: number[], isBuy: boolean) => {
  const descriptions = isBuy ? tierDescriptions : sellTierDescriptions;
  const threshold = tiers[1] / descriptions.length;
  const index = Math.ceil(tiers[0] / threshold) - 1;
  return descriptions[Math.min(Math.max(0, index), descriptions.length - 1)];
};

const PaymentMethod: React.FC<Props> = ({
  payment,
  onPress,
  highlighted,
  compact,
  isBuy,
}: Props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const { name, logo, amountTier, delay: time, detail } = payment;

  return (
    <Box onPress={onPress} highlighted={highlighted} compact>
      <ListItem
        bottomAccessory={
          <>
            <View style={[styles.line, compact && styles.compactLine]} />

            <Text variant={TextVariant.BodySM}>
              <Feather name="clock" /> {renderTime(time)} •{' '}
              {new Array(amountTier[1]).fill('').map((_, index) => (
                <Text
                  key={index}
                  color={
                    index >= amountTier[0] ? TextColor.Muted : TextColor.Default
                  }
                >
                  $
                </Text>
              ))}{' '}
              {renderTiers(amountTier, isBuy)}
            </Text>
          </>
        }
      >
        <ListItemColumn>
          <View
            style={[styles.iconWrapper, compact && styles.compactIconWrapper]}
          >
            <PaymentMethodIcon
              paymentMethodIcons={payment.icons}
              paymentMethodType={payment.paymentType}
              size={compact ? 13 : 16}
              style={styles.icon}
            />
          </View>
        </ListItemColumn>

        <ListItemColumn widthType={WidthType.Fill}>
          <Text variant={TextVariant.BodyLGMedium} style={styles.methodName}>
            {name}
          </Text>
          {detail ? <Text color={TextColor.Primary}>{detail}</Text> : null}
        </ListItemColumn>

        <ListItemColumn>
          {logo ? (
            <View style={styles.cardIcons}>
              <PaymentMethodBadges
                style={styles.cardIcon}
                logosByTheme={logo}
              />
            </View>
          ) : null}
        </ListItemColumn>
      </ListItem>
    </Box>
  );
};

export default PaymentMethod;
