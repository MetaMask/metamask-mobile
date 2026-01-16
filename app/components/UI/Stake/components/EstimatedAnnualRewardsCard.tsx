import React from 'react';
import { StyleSheet, View } from 'react-native';
import TouchableOpacity from '../../../Base/TouchableOpacity';
import { strings } from '../../../../../locales/i18n';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    rewardCard: {
      backgroundColor: colors.background.muted,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
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

interface EstimatedAnnualRewardsCardProps {
  estimatedAnnualRewards: string;
  isLoading?: boolean;
  onIconPress: () => void;
}

const EstimatedAnnualRewardsCard = ({
  estimatedAnnualRewards,
  onIconPress,
  isLoading = false,
}: EstimatedAnnualRewardsCardProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.rewardCard}>
      <View style={styles.rewardRow}>
        <View style={styles.labelWithIcon}>
          <Text variant={TextVariant.BodyMDMedium}>
            {strings('stake.metamask_pool')}
          </Text>
          <TouchableOpacity
            onPress={onIconPress}
            accessibilityLabel="Learn More"
          >
            <Icon
              name={IconName.Question}
              color={IconColor.Muted}
              size={IconSize.Sm}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.rewardRateContainer}>
          {isLoading ? (
            <SkeletonPlaceholder>
              <SkeletonPlaceholder.Item
                width={60}
                height={20}
                borderRadius={6}
              />
            </SkeletonPlaceholder>
          ) : (
            <Text color={TextColor.Success} variant={TextVariant.BodyMDMedium}>
              {estimatedAnnualRewards}
            </Text>
          )}
          <Text
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
          >
            {strings('stake.estimated_annual_rewards')}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default EstimatedAnnualRewardsCard;
