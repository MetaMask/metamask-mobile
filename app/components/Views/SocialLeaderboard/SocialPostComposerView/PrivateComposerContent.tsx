import {
  Box,
  BoxAlignItems,
  ButtonIcon,
  ButtonIconSize,
  Icon,
  IconColor,
  IconName,
  IconSize,
  TabEmptyState,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import HeaderBaseGlass from '../../../../component-library/components-temp/HeaderBaseGlass';
import Routes from '../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { selectGlassHeadersEnabled } from '../../../../selectors/featureFlagController/glassHeaders';
import SocialHeaderGlassSurface from '../components/SocialHeaderGlassSurface';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../shared/scrollableScreenSafeArea';
import { SocialEvent, useSocialScreenAnalytics } from '../analytics';
import { resolvePostComposerAnalyticsSource } from './resolvePostComposerAnalyticsSource';
import type { SocialPostComposerViewParams } from './SocialPostComposerView.types';
import { SocialPostComposerViewSelectorsIDs } from './SocialPostComposerView.testIds';

const { Interaction, Outcome, Screen } = SocialEvent;

/**
 * Degraded composer shown to private profiles: explains that private
 * profiles can't publish and links to privacy settings. It never changes
 * the profile's privacy itself.
 */
const PrivateComposerContent: React.FC = () => {
  const tw = useTailwind();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const routeParams = route.params as SocialPostComposerViewParams | undefined;
  const trackInteraction = useSocialScreenAnalytics(Screen.POST_COMPOSER, {
    source: resolvePostComposerAnalyticsSource(routeParams),
    outcome: Outcome.EMPTY,
  });

  const handleClose = useCallback(() => {
    trackInteraction(Interaction.BUTTON_CLICKED, Outcome.DISMISSED);
    navigation.goBack();
  }, [navigation, trackInteraction]);

  const handleOpenPrivacySettings = useCallback(() => {
    trackInteraction(Interaction.BUTTON_CLICKED, Outcome.SUCCESS);
    navigation.navigate(Routes.SOCIAL.MANAGE_PROFILE_TRADING_ACTIVITY);
  }, [navigation, trackInteraction]);

  return (
    <SafeAreaView
      edges={SCROLLABLE_SCREEN_SAFE_AREA_EDGES}
      style={tw.style('flex-1 bg-default')}
      testID={SocialPostComposerViewSelectorsIDs.CONTAINER}
    >
      <HeaderBaseGlass
        isGlass={isGlassHeader}
        isFloating={false}
        includesTopInset
        twClassName="px-4"
        startAccessory={
          <SocialHeaderGlassSurface twClassName="w-10 justify-center">
            <ButtonIcon
              iconName={IconName.Close}
              size={ButtonIconSize.Md}
              onPress={handleClose}
              testID={SocialPostComposerViewSelectorsIDs.CLOSE_BUTTON}
              accessibilityLabel={strings('social_leaderboard.composer.close')}
            />
          </SocialHeaderGlassSurface>
        }
        testID={SocialPostComposerViewSelectorsIDs.HEADER}
      />
      <Box alignItems={BoxAlignItems.Center} twClassName="px-8 py-12">
        <TabEmptyState
          icon={
            <Box alignItems={BoxAlignItems.Center} gap={4} twClassName="w-full">
              <Box
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Icon
                  name={IconName.EyeSlash}
                  size={IconSize.Xl}
                  color={IconColor.IconDefault}
                />
              </Box>
              <Box gap={1} twClassName="w-full">
                <Text variant={TextVariant.HeadingSm} twClassName="text-center">
                  {strings(
                    'social_leaderboard.trader_profile.private_title_own',
                  )}
                </Text>
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                  twClassName="text-center"
                >
                  {strings('social_leaderboard.composer.private_description')}
                </Text>
              </Box>
            </Box>
          }
          actionButtonText={strings(
            'social_leaderboard.trader_profile.privacy_settings',
          )}
          onAction={handleOpenPrivacySettings}
          actionButtonProps={{
            twClassName: 'self-center rounded-xl',
            testID: SocialPostComposerViewSelectorsIDs.PRIVACY_SETTINGS_BUTTON,
          }}
          twClassName="w-full max-w-none"
          testID={SocialPostComposerViewSelectorsIDs.PRIVATE_STATE}
        />
      </Box>
    </SafeAreaView>
  );
};

export default PrivateComposerContent;
