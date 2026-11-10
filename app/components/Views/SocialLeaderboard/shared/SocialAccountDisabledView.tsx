import React, { useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Box, BoxJustifyContent } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import HeaderStandardGlass from '../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../selectors/featureFlagController/glassHeaders';
import SocialAccountDisabledBanner from '../../../UI/SocialFeed/components/SocialAccountDisabledBanner';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from './scrollableScreenSafeArea';

export const SocialAccountDisabledViewSelectorsIDs = {
  CONTAINER: 'social-account-disabled-view',
  BACK_BUTTON: 'social-account-disabled-view-back-button',
} as const;

/**
 * What every social screen shows instead of itself while the moderation team
 * has the viewer's account disabled: the disabled-account banner, and a way
 * back when the screen was pushed.
 */
const SocialAccountDisabledView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;

  return (
    <SafeAreaView
      edges={SCROLLABLE_SCREEN_SAFE_AREA_EDGES}
      style={tw.style('flex-1 bg-default')}
      testID={SocialAccountDisabledViewSelectorsIDs.CONTAINER}
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        includesTopInset
        title=""
        {...(canGoBack && {
          onBack: handleBack,
          backButtonProps: {
            testID: SocialAccountDisabledViewSelectorsIDs.BACK_BUTTON,
          },
        })}
      />
      <Box justifyContent={BoxJustifyContent.Center} twClassName="flex-1 px-4">
        <SocialAccountDisabledBanner />
      </Box>
    </SafeAreaView>
  );
};

export default SocialAccountDisabledView;
