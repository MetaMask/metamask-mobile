import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  Spinner,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { ScrollView, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../shared/scrollableScreenSafeArea';
import { MyProfileViewSelectorsIDs } from './MyProfileView.testIds';
import MyProfileHeader from './components/MyProfileHeader';
import ProfilePostsEmptyState from './components/ProfilePostsEmptyState';
import { useMyProfile } from './hooks';

const MyProfileView: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const tw = useTailwind();
  const { profile, isLoading, error, refresh } = useMyProfile();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleEditProfile = useCallback(() => {
    navigation.navigate(Routes.SOCIAL.MANAGE_PROFILE);
  }, [navigation]);
  const handleShareFirstTrade = useCallback(() => undefined, []);

  const handleShareProfile = useCallback(() => {
    if (!profile) {
      return;
    }

    const message = strings(
      'social_leaderboard.my_profile.share_profile_message',
      {
        displayName: profile.displayName,
        profileUrl: profile.shareUrl,
      },
    );
    Share.share({ message }).catch(() => undefined);
  }, [profile]);

  return (
    <SafeAreaView
      edges={SCROLLABLE_SCREEN_SAFE_AREA_EDGES}
      style={tw.style('flex-1 bg-default')}
      testID={MyProfileViewSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        includesTopInset
        title=""
        onBack={handleBack}
        backButtonProps={{ testID: MyProfileViewSelectorsIDs.BACK_BUTTON }}
        testID={MyProfileViewSelectorsIDs.HEADER}
      />

      {isLoading && !profile ? (
        <Box
          twClassName="flex-1"
          alignItems={BoxAlignItems.Center}
          paddingTop={12}
          testID={MyProfileViewSelectorsIDs.LOADING}
        >
          <Spinner />
        </Box>
      ) : error && !profile ? (
        <Box
          twClassName="flex-1"
          alignItems={BoxAlignItems.Center}
          paddingHorizontal={4}
          paddingTop={12}
          gap={4}
          testID={MyProfileViewSelectorsIDs.ERROR}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {error}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            onPress={refresh}
            testID={MyProfileViewSelectorsIDs.RETRY_BUTTON}
          >
            {strings('social_leaderboard.my_profile.retry')}
          </Button>
        </Box>
      ) : profile ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('flex-grow pb-6')}
        >
          <MyProfileHeader profile={profile} />

          <Box
            flexDirection={BoxFlexDirection.Row}
            gap={2}
            paddingHorizontal={4}
            paddingBottom={8}
          >
            <Box twClassName="flex-1">
              <Button
                variant={ButtonVariant.Secondary}
                isFullWidth
                onPress={handleEditProfile}
                testID={MyProfileViewSelectorsIDs.EDIT_PROFILE_BUTTON}
              >
                {strings('social_leaderboard.my_profile.edit_profile')}
              </Button>
            </Box>
            <Box twClassName="flex-1">
              <Button
                variant={ButtonVariant.Secondary}
                isFullWidth
                onPress={handleShareProfile}
                testID={MyProfileViewSelectorsIDs.SHARE_PROFILE_BUTTON}
              >
                {strings('social_leaderboard.my_profile.share_profile')}
              </Button>
            </Box>
          </Box>

          <Box twClassName="border-b border-muted">
            <Box
              twClassName="self-start border-b-2 border-default"
              paddingHorizontal={4}
              paddingBottom={3}
              testID={MyProfileViewSelectorsIDs.POSTS_TAB}
            >
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
                {strings('social_leaderboard.my_profile.posts')}
              </Text>
            </Box>
          </Box>

          <ProfilePostsEmptyState onShareFirstTrade={handleShareFirstTrade} />
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
};

export default MyProfileView;
