import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
  TextColor
} from '../../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import AvatarGroup from '../../../../component-library/components/Avatars/AvatarGroup';
import { AvatarVariant, AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import type { PerpsToken } from './PerpsTokenSelector';

interface PerpsPayWithRowProps {
  selectedToken: PerpsToken;
  tokenAmount: string;
  onPress: () => void;
  testID?: string;
  showUsdEquivalent?: boolean;
  usdEquivalent?: string;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      width: '100%',
      marginVertical: 8,
    },
    payWithContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    amountText: {
      fontSize: 16,
      fontWeight: '600',
    },
    tokenSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary.muted,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    tokenSymbol: {
      fontSize: 14,
      fontWeight: '600',
    },
  });

const PerpsPayWithRow: React.FC<PerpsPayWithRowProps> = ({
  selectedToken,
  tokenAmount,
  onPress,
  testID = 'perps-pay-with-row',
  showUsdEquivalent = false,
  usdEquivalent,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container} testID={testID}>
      <TouchableOpacity
        style={styles.payWithContainer}
        onPress={onPress}
        testID={`${testID}-selector`}
      >
        <View style={styles.leftSection}>
          <Text
            style={styles.label}
            testID={`${testID}-label`}
          >
            PAY WITH
          </Text>
        </View>

        <View style={styles.rightSection}>
          <Text
            variant={TextVariant.BodyMDMedium}
            style={styles.amountText}
            testID={`${testID}-amount`}
          >
            {tokenAmount} {selectedToken.symbol}
          </Text>

          <View style={styles.tokenSelector}>
            <AvatarGroup
              avatarPropsList={[
                {
                  variant: AvatarVariant.Network,
                  name: 'Arbitrum',
                  imageSource: { uri: 'https://assets.coingecko.com/coins/images/16547/large/photo_2023-03-29_21.47.00.jpeg' },
                },
                {
                  variant: AvatarVariant.Token,
                  name: selectedToken.symbol,
                  imageSource: selectedToken.iconUrl ? { uri: selectedToken.iconUrl } : undefined,
                },
              ]}
              size={AvatarSize.Sm}
            />
            <Icon
              name={IconName.ArrowDown}
              size={IconSize.Xs}
              color={IconColor.Primary}
            />
          </View>
        </View>
      </TouchableOpacity>

      {showUsdEquivalent && usdEquivalent && (
        <Text
          variant={TextVariant.BodyMDMedium}
          color={TextColor.Muted}
          testID={`${testID}-usd-equivalent`}
        >
          ≈ ${usdEquivalent}
        </Text>
      )}
    </View>
  );
};

export default PerpsPayWithRow;
