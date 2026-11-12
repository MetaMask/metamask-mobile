import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import MoneyVbaHomeCardHeroAnimation from '../../../Money/components/MoneyVbaHomeCard/MoneyVbaHomeCardHeroAnimation';
import { MONEY_VBA_HOME_CARD_CONFIG } from '../../../Money/components/MoneyVbaHomeCard/MoneyVbaHomeCardConfig';

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
});

/**
 * VBA verifying-identity Rive for the Immersve reopen prompt — play once, hold.
 *
 * Asset: `app/animations/money_vba_verifying_identity.riv`
 * Artboard / state machine: "Verify Identity" (same as Money VBA `kyc_pending`)
 * Timeline: In → Loop (oneShot, holds end pose). ViewModel trigger `dismiss`
 * would play Out; we never fire it (same as VBA's home card).
 *
 * Uses `MoneyVbaHomeCardHeroAnimation` exactly so sizing (fallback 106.5×88),
 * Fit.Contain, Alignment.Center, and play-once behaviour match VBA. No loop /
 * re-trigger logic — Connor: play through once and rest on the final frame.
 */
const ImmersveVerifyingIdentityAnimation = () => {
  const hero = MONEY_VBA_HOME_CARD_CONFIG.kyc_pending;
  if (!hero.heroAnimation) {
    return null;
  }

  const size = {
    width: hero.heroArt.width,
    height: hero.heroArt.height,
  };

  return (
    // Clip anything that escapes the fixed VBA hero frame (In has a zoom).
    <Box style={[size, styles.clip]}>
      <MoneyVbaHomeCardHeroAnimation
        animation={hero.heroAnimation}
        fallback={hero.heroArt}
      />
    </Box>
  );
};

export default ImmersveVerifyingIdentityAnimation;
