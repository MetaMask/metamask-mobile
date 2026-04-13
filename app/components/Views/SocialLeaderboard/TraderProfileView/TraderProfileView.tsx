import React, { useCallback, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import { TraderProfileViewSelectorsIDs } from './TraderProfileView.testIds';
import { useTraderProfile, useTraderPositions } from './hooks';
import ProfileHeader from './components/ProfileHeader';
import StatsRow from './components/StatsRow';
import PositionRow from './components/PositionRow';

const POSITION_SKELETON_COUNT = 4;
const POSITION_SKELETON_KEYS = Array.from(
  { length: POSITION_SKELETON_COUNT },
  (_, i) => `position-skeleton-${i}`,
);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  testID?: string;
}

const TabButton: React.FC<TabButtonProps> = ({
  label,
  isActive,
  onPress,
  testID,
}) => (
  <TouchableOpacity onPress={onPress} testID={testID}>
    <Box twClassName={`pb-2 ${isActive ? 'border-b-2 border-default' : ''}`}>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={isActive ? TextColor.TextDefault : TextColor.TextMuted}
      >
        {label}
      </Text>
    </Box>
  </TouchableOpacity>
);

interface SkeletonProps {
  colors: ReturnType<typeof useTheme>['colors'];
  tw: ReturnType<typeof useTailwind>;
}

const ProfileHeaderSkeleton: React.FC<SkeletonProps> = ({ colors, tw }) => (
  <View style={tw.style('px-4 py-3')}>
    <SkeletonPlaceholder
      backgroundColor={colors.background.section}
      highlightColor={colors.background.subsection}
    >
      <View style={tw.style('flex-row items-center')}>
        <View style={tw.style('w-10 h-10 rounded-full mr-4')} />
        <View style={tw.style('flex-1 gap-1.5')}>
          <View style={tw.style('w-28 h-5 rounded')} />
          <View style={tw.style('w-20 h-3 rounded')} />
        </View>
        <View style={tw.style('w-20 h-8 rounded-xl ml-3')} />
      </View>
    </SkeletonPlaceholder>
  </View>
);

const StatsRowSkeleton: React.FC<SkeletonProps> = ({ colors, tw }) => (
  <View style={tw.style('px-4 py-3')}>
    <SkeletonPlaceholder
      backgroundColor={colors.background.section}
      highlightColor={colors.background.subsection}
    >
      <View style={tw.style('flex-row justify-around')}>
        <View style={tw.style('items-center gap-1')}>
          <View style={tw.style('w-12 h-5 rounded')} />
          <View style={tw.style('w-16 h-3 rounded')} />
        </View>
        <View style={tw.style('items-center gap-1')}>
          <View style={tw.style('w-16 h-5 rounded')} />
          <View style={tw.style('w-14 h-3 rounded')} />
        </View>
        <View style={tw.style('items-center gap-1')}>
          <View style={tw.style('w-14 h-5 rounded')} />
          <View style={tw.style('w-16 h-3 rounded')} />
        </View>
      </View>
    </SkeletonPlaceholder>
  </View>
);

const PositionRowSkeleton: React.FC<SkeletonProps> = ({ colors, tw }) => (
  <View style={tw.style('px-4 py-3')}>
    <SkeletonPlaceholder
      backgroundColor={colors.background.section}
      highlightColor={colors.background.subsection}
    >
      <View style={tw.style('flex-row items-center')}>
        <View style={tw.style('w-10 h-10 rounded-full mr-4')} />
        <View style={tw.style('flex-1 gap-1.5')}>
          <View style={tw.style('w-20 h-4 rounded')} />
          <View style={tw.style('w-28 h-3 rounded')} />
        </View>
        <View style={tw.style('items-end gap-1.5')}>
          <View style={tw.style('w-20 h-4 rounded')} />
          <View style={tw.style('w-12 h-3 rounded')} />
        </View>
      </View>
    </SkeletonPlaceholder>
  </View>
);

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const TraderProfileView = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'TraderProfileView'>>();
  const tw = useTailwind();
  const { colors } = useTheme();

  const { traderId, traderName } = route.params;

  const { profile, isLoading, isFollowing, toggleFollow } =
    useTraderProfile(traderId);
  const { openPositions, closedPositions, isLoadingOpen, isLoadingClosed } =
    useTraderPositions(traderId);

  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleNotificationPress = useCallback(() => {
    // TBD — notification preferences not yet wired
  }, []);

  const positions = activeTab === 'open' ? openPositions : closedPositions;
  const isLoadingPositions =
    activeTab === 'open' ? isLoadingOpen : isLoadingClosed;

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={TraderProfileViewSelectorsIDs.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-2 py-2"
      >
        <Box twClassName="w-20">
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Md}
            onPress={handleBack}
            testID={TraderProfileViewSelectorsIDs.BACK_BUTTON}
          />
        </Box>
        <Text
          variant={TextVariant.HeadingSm}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
          numberOfLines={1}
        >
          {traderName}
        </Text>
        <Box twClassName="w-20 items-end">
          <ButtonIcon
            iconName={IconName.Notification}
            size={ButtonIconSize.Md}
            onPress={handleNotificationPress}
            testID={TraderProfileViewSelectorsIDs.NOTIFICATION_BUTTON}
          />
        </Box>
      </Box>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('pb-6')}
      >
        {isLoading || !profile ? (
          <ProfileHeaderSkeleton colors={colors} tw={tw} />
        ) : (
          <ProfileHeader
            profile={profile.profile}
            followerCount={profile.followerCount}
          />
        )}

        {isLoading || !profile ? (
          <StatsRowSkeleton colors={colors} tw={tw} />
        ) : (
          <StatsRow stats={profile.stats} />
        )}

        <Box twClassName="px-4 pt-3 pb-1">
          <Button
            variant={
              isFollowing ? ButtonVariant.Secondary : ButtonVariant.Primary
            }
            isFullWidth
            onPress={toggleFollow}
            testID={TraderProfileViewSelectorsIDs.FOLLOW_BUTTON}
          >
            {isFollowing
              ? strings('social_leaderboard.following')
              : strings('social_leaderboard.follow')}
          </Button>
        </Box>

        <Box twClassName="h-px bg-muted mx-4 mt-5 mb-4" />

        <Box
          flexDirection={BoxFlexDirection.Row}
          twClassName="px-4 mb-2"
          gap={4}
        >
          <TabButton
            label={strings('social_leaderboard.trader_profile.open')}
            isActive={activeTab === 'open'}
            onPress={() => setActiveTab('open')}
            testID={TraderProfileViewSelectorsIDs.TAB_OPEN}
          />
          <TabButton
            label={strings('social_leaderboard.trader_profile.closed')}
            isActive={activeTab === 'closed'}
            onPress={() => setActiveTab('closed')}
            testID={TraderProfileViewSelectorsIDs.TAB_CLOSED}
          />
        </Box>

        {isLoadingPositions ? (
          POSITION_SKELETON_KEYS.map((key) => (
            <PositionRowSkeleton key={key} colors={colors} tw={tw} />
          ))
        ) : positions.length === 0 ? (
          <Box twClassName="px-4 py-8" alignItems={BoxAlignItems.Center}>
            <Text variant={TextVariant.BodyMd} color={TextColor.TextMuted}>
              {strings('social_leaderboard.trader_profile.no_positions')}
            </Text>
          </Box>
        ) : (
          positions.map((position) => (
            <PositionRow
              key={`${position.tokenAddress}-${position.chain}`}
              position={position}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default TraderProfileView;
