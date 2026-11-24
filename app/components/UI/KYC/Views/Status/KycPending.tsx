import React, { useCallback, useEffect } from 'react';
import { ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { useTrackKycResultViewed } from '../../hooks/useTrackKycResultViewed';
import { fireImpact, ImpactMoment } from '../../../../../util/haptics';
import useVerifiedSuccessCascade from '../../hooks/useVerifiedSuccessCascade';
import MoneyVbaHomeCardHeroAnimation from '../../../Money/components/MoneyVbaHomeCard/MoneyVbaHomeCardHeroAnimation';
import { MONEY_VBA_HOME_CARD_CONFIG } from '../../../Money/components/MoneyVbaHomeCard/MoneyVbaHomeCardConfig';
import MarketingMomentTitle from '../../../MarketingMomentTitle';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

// VBA's verifying-identity scanner Rive (the Money home card's), scaled up to
// this screen's 104px illustration height. The fallback art keeps its ratio.
const VERIFYING_HERO = MONEY_VBA_HOME_CARD_CONFIG.kyc_pending;
const VERIFYING_HERO_HEIGHT = 104;
const VERIFYING_HERO_ART = {
  ...VERIFYING_HERO.heroArt,
  width: Math.round(
    (VERIFYING_HERO.heroArt.width / VERIFYING_HERO.heroArt.height) *
      VERIFYING_HERO_HEIGHT,
  ),
  height: VERIFYING_HERO_HEIGHT,
};

export const KycPendingSelectorsIDs = {
  CONTAINER: 'kyc-pending-container',
  ILLUSTRATION: 'kyc-pending-illustration',
  COME_BACK_LATER_BUTTON: 'kyc-pending-come-back-later-button',
} as const;

interface KycPendingProps {
  /** Leaves the pending screen. The caller chooses the destination. */
  onLeave: () => void;
  /**
   * Replaces the default copy for a caller whose flow words the wait
   * differently. Omitted keeps the shared UKYC copy.
   */
  title?: string;
  description?: string;
  /** Replaces the default button label. Omitted keeps the shared UKYC one. */
  buttonLabel?: string;
}

const KycPending = ({
  onLeave,
  title,
  description,
  buttonLabel,
}: KycPendingProps) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  useTrackKycResultViewed('pending');
  const tw = useTailwind();
  // Identity verified's entrance: the title, body and button fade and rise
  // in one after another. The scanner starts on mount, so the cascade does too.
  const {
    mode,
    startEntrance,
    titleStyle,
    descriptionStyle,
    buttonStyle,
    isButtonInteractive,
  } = useVerifiedSuccessCascade();
  useEffect(() => {
    if (mode === 'animate') {
      startEntrance();
    }
  }, [mode, startEntrance]);

  const handleComeBackLater = useCallback(() => {
    fireImpact(ImpactMoment.PrimaryCTA);
    onLeave();
  }, [onLeave]);

  // Laid out like Identity verified (same header space, title, body and
  // footer), so the wait and the result read as one screen changing state.
  // No back: Come back later is the way out.
  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        includesTopInset
      />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow justify-center px-4 pb-6')}
        testID={KycPendingSelectorsIDs.CONTAINER}
      >
        <TitleStandard
          title={
            <Animated.View style={[tw.style('w-full'), titleStyle]}>
              <MarketingMomentTitle twClassName="w-full text-center">
                {title ?? strings('kyc.kyc_taking_longer.title')}
              </MarketingMomentTitle>
            </Animated.View>
          }
          bottomLabel={
            <Animated.View style={[tw.style('w-full'), descriptionStyle]}>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                twClassName="text-center"
              >
                {description ??
                  strings('kyc.kyc_taking_longer.description_few_minutes')}
              </Text>
            </Animated.View>
          }
          titleWrapperProps={{ justifyContent: BoxJustifyContent.Center }}
          bottomLabelWrapperProps={{
            justifyContent: BoxJustifyContent.Center,
          }}
          topAccessory={
            <Box
              alignItems={BoxAlignItems.Center}
              twClassName="mb-5 w-full"
              testID={KycPendingSelectorsIDs.ILLUSTRATION}
            >
              {VERIFYING_HERO.heroAnimation ? (
                <Box
                  style={tw.style('overflow-hidden', {
                    width: VERIFYING_HERO_ART.width,
                    height: VERIFYING_HERO_ART.height,
                  })}
                >
                  <MoneyVbaHomeCardHeroAnimation
                    animation={VERIFYING_HERO.heroAnimation}
                    fallback={VERIFYING_HERO_ART}
                  />
                </Box>
              ) : null}
            </Box>
          }
        />
      </ScrollView>
      <Animated.View
        style={buttonStyle}
        pointerEvents={isButtonInteractive ? 'auto' : 'none'}
      >
        <Box twClassName="px-4 pb-2 pt-4">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleComeBackLater}
            testID={KycPendingSelectorsIDs.COME_BACK_LATER_BUTTON}
          >
            {buttonLabel ?? strings('kyc.kyc_taking_longer.done_button')}
          </Button>
        </Box>
      </Animated.View>
    </SafeAreaView>
  );
};

export default KycPending;
