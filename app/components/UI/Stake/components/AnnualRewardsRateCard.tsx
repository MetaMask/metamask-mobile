import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon, {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    rewardCard: {
      backgroundColor: colors.background.default,
      borderColor: colors.border.default,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rewardRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    rewardRateContainer: {
      alignItems: 'flex-end',
    },
    labelWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
  });

interface AnnualRewardRateCardProps {
  annualRewardRate: string;
  onIconPress: () => void;
}

const AnnualRewardRateCard = ({
  annualRewardRate,
  onIconPress,
}: AnnualRewardRateCardProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.rewardCard}>
      <View style={styles.rewardRow}>
        <View style={styles.labelWithIcon}>
          <Text variant={TextVariant.BodyMDMedium}>MetaMask Pool</Text>
          <TouchableOpacity onPress={onIconPress}>
            <Icon name={IconName.Question} color={IconColor.Alternative} />
          </TouchableOpacity>
        </View>
        <View style={styles.rewardRateContainer}>
          <Text color={TextColor.Success} variant={TextVariant.BodyMDMedium}>
            {annualRewardRate}
          </Text>
          <Text
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
          >
            Est. annual rewards
          </Text>
        </View>
      </View>
    </View>
  );
};

export default AnnualRewardRateCard;
