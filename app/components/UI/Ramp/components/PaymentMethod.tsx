import React from 'react';
import { StyleSheet, View } from 'react-native';
import Box from './Box';
import Feather from 'react-native-vector-icons/Feather';
import Text from '../../../Base/Text';
import BaseListItem from '../../../Base/ListItem';
import { strings } from '../../../../../locales/i18n';
import { TimeDescriptions, timeToDescription } from '../utils';
import { useTheme } from '../../../../util/theme';
import { Colors } from '../../../../util/theme/models';
import PaymentMethodBadges from './PaymentMethodBadges';
import { Payment } from '@consensys/on-ramp-sdk';
import PaymentMethodIcon from './PaymentMethodIcon';
// TODO: Convert into typescript and correctly type optionals
const ListItem = BaseListItem as any;

interface Props {
  payment: Payment;
  onPress?: () => void;
  highlighted?: boolean;
  compact?: boolean;
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
const renderTiers = (tiers: number[]) => {
  const threshold = tiers[1] / tierDescriptions.length;
  const index = Math.ceil(tiers[0] / threshold) - 1;
  return tierDescriptions[
    Math.min(Math.max(0, index), tierDescriptions.length - 1)
  ];
};

const PaymentMethod: React.FC<Props> = ({
  payment,
  onPress,
  highlighted,
  compact,
}: Props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const { name, logo, amountTier, delay: time, detail } = payment;

  return (
    <Box onPress={onPress} highlighted={highlighted}>
      <ListItem.Content>
        <ListItem.Icon>
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
        </ListItem.Icon>
        <ListItem.Body>
          <ListItem.Title>
            <Text big primary bold>
              {name}
            </Text>
          </ListItem.Title>
          {detail ? (
            <Text small blue>
              {detail}
            </Text>
          ) : null}
        </ListItem.Body>
        {logo ? (
          <ListItem.Amounts>
            <ListItem.Amount>
              <View style={styles.cardIcons}>
                <PaymentMethodBadges
                  style={styles.cardIcon}
                  logosByTheme={logo}
                />
              </View>
            </ListItem.Amount>
          </ListItem.Amounts>
        ) : null}
      </ListItem.Content>

      <View style={[styles.line, compact && styles.compactLine]} />

      <Text primary small>
        <Feather name="clock" /> {renderTime(time)} •{' '}
        {new Array(amountTier[1]).fill('').map((_, index) => (
          <Text small muted={index >= amountTier[0]} key={index}>
            $
          </Text>
        ))}{' '}
        {renderTiers(amountTier)}
      </Text>
    </Box>
  );
};

export default PaymentMethod;
