import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Box from './Box';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { Colors } from '../../../../../util/theme/models';
import ListItem from '../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import DownChevronText from './DownChevronText';
import RemoteImage from '../../../../Base/RemoteImage';
import SkeletonText from './SkeletonText';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    chevron: {
      marginLeft: 10,
      color: colors.icon.default,
    },
    icon: {
      width: 30,
      height: 20,
      marginRight: 6,
    },
    iconContainer: {
      flexDirection: 'row',
      margin: 16,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border.muted,
      marginLeft: 16,
      marginRight: 16,
    },
  });

export interface IProps {
  id?: string;
  name?: string;
  label?: string;
  icon?: ReactNode;
  highlighted?: boolean;
  loading?: boolean;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPress?: () => any;
  paymentMethodIcons?: string[];
}

const PaymentMethodSelector: React.FC<IProps> = ({
  name,
  icon,
  label,
  highlighted,
  loading,
  onPress,
  paymentMethodIcons = [],
}: IProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <Box
      label={label}
      onPress={loading ? undefined : onPress}
      highlighted={highlighted}
      compact
    >
      <ListItem>
        <ListItemColumn>
          {loading ? <SkeletonText small /> : Boolean(icon) && icon}
        </ListItemColumn>
        <ListItemColumn widthType={WidthType.Fill}>
          {loading ? (
            <SkeletonText />
          ) : (
            <Text variant={TextVariant.BodyLGMedium}>{name}</Text>
          )}
        </ListItemColumn>
        {!loading && (
          <DownChevronText
            text={strings('fiat_on_ramp_aggregator.payment_method.change')}
          />
        )}
      </ListItem>
      <View style={styles.divider} />
      <View style={styles.iconContainer}>
        {loading ? (
          <SkeletonText small />
        ) : (
          paymentMethodIcons.map((logoURL) => (
            <RemoteImage
              key={logoURL}
              source={{ uri: logoURL }}
              style={styles.icon}
            />
          ))
        )}
      </View>
    </Box>
  );
};

export default PaymentMethodSelector;
