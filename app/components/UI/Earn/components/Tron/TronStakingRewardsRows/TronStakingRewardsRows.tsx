import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon as DSIcon,
  IconName as DSIconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName as CLIconName,
  IconSize as CLIconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import {
  TextColor as CLTextColor,
  TextVariant as CLTextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../../component-library/components/Texts/SensitiveText';
import { strings } from '../../../../../../../locales/i18n';
import { selectPrivacyMode } from '../../../../../../selectors/preferencesController';
import { useSelector } from 'react-redux';
import type { TokenI } from '../../../../Tokens/types';
import { TronStakingRewardsRowsTestIds } from './TronStakingRewardsRows.testIds';
import useTronStakingRewardsSummary from './useTronStakingRewardsSummary';

export interface TronStakingRewardsRowsProps {
  token: TokenI;
  apyDecimal: string | null;
  isApyLoading: boolean;
}

const ICON_CIRCLE_TW =
  'h-10 w-10 rounded-full bg-muted mr-4 items-center justify-center';

const RewardRow = ({
  testID,
  icon,
  title,
  subtitle,
  subtitleTestID,
  showSubtitleSkeleton,
  privacyMode,
}: {
  testID: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string | null;
  subtitleTestID: string;
  showSubtitleSkeleton: boolean;
  privacyMode: boolean;
}) => (
  <Box
    testID={testID}
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    paddingTop={3}
    paddingBottom={3}
  >
    <Box twClassName={ICON_CIRCLE_TW}>{icon}</Box>
    <Box twClassName="flex-1">
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {title}
      </Text>
      {showSubtitleSkeleton ? (
        <View>
          <SkeletonPlaceholder>
            <SkeletonPlaceholder.Item
              width={180}
              height={16}
              borderRadius={4}
            />
          </SkeletonPlaceholder>
        </View>
      ) : (
        <SensitiveText
          variant={CLTextVariant.BodySM}
          color={CLTextColor.Alternative}
          isHidden={privacyMode}
          length={SensitiveTextLength.Medium}
          testID={subtitleTestID}
        >
          {subtitle ?? ''}
        </SensitiveText>
      )}
    </Box>
  </Box>
);

const TronStakingRewardsRows = ({
  token,
  apyDecimal,
  isApyLoading,
}: TronStakingRewardsRowsProps) => {
  const privacyMode = useSelector(selectPrivacyMode);
  const { totalSubtitle, estimatedSubtitle, showEstimatedSkeleton } =
    useTronStakingRewardsSummary({
      token,
      apyDecimal,
      isApyLoading,
    });

  return (
    <Box testID={TronStakingRewardsRowsTestIds.CONTAINER}>
      <RewardRow
        testID={TronStakingRewardsRowsTestIds.TOTAL_REWARDS_ROW}
        icon={<DSIcon name={DSIconName.MoneyBag} size={IconSize.Lg} />}
        title={strings('stake.tron.total_rewards')}
        subtitle={totalSubtitle}
        subtitleTestID={TronStakingRewardsRowsTestIds.TOTAL_SUBTITLE}
        showSubtitleSkeleton={false}
        privacyMode={privacyMode}
      />
      <RewardRow
        testID={TronStakingRewardsRowsTestIds.ESTIMATED_ANNUAL_ROW}
        icon={<Icon name={CLIconName.Calendar} size={CLIconSize.Md} />}
        title={strings('stake.estimated_annual_rewards')}
        subtitle={estimatedSubtitle}
        subtitleTestID={TronStakingRewardsRowsTestIds.ESTIMATED_SUBTITLE}
        showSubtitleSkeleton={showEstimatedSkeleton}
        privacyMode={privacyMode}
      />
    </Box>
  );
};

export default TronStakingRewardsRows;
