// PROTOTYPE-DO-NOT-MERGE
// Paper screens: KP-29, KP-31, KP-33 (see prototypeScreens.ts)
import React from 'react';
import { Image, Linking } from 'react-native';
import BannerCompact, {
  type BannerCompactProps,
} from '../../../../../component-library/components-temp/BannerCompact';
// The VBA can't-verify X, cropped to its artwork so it sits as large as the tick.
import cantVerifyArt from './kalshi-proto-cant-verify-x.png';
import verifiedCheckAnimation from '../../../../../animations/card_verified_check.riv';
import kycVerifiedCheckArt from '../../components/assets/kyc-identity-verified-art.png';
import MoneyVbaHomeCardHeroAnimation from '../../../Money/components/MoneyVbaHomeCard/MoneyVbaHomeCardHeroAnimation';
import { MONEY_VBA_HOME_CARD_CONFIG } from '../../../Money/components/MoneyVbaHomeCard/MoneyVbaHomeCardConfig';
import { PROTOTYPE_COPY } from './prototypeConstants';
import type { KalshiPrototypeCardState } from './prototypeRuntime';
import { KalshiPrototypeStatusCardSelectorsIDs } from './KalshiPrototypeStatusCard.testIds';

/** The scanner Rive KycPending presents, contained in the thumbnail slot. */
const VERIFYING_HERO = MONEY_VBA_HOME_CARD_CONFIG.kyc_pending;
const THUMBNAIL_WIDTH = 72;
const VERIFYING_THUMBNAIL = {
  ...VERIFYING_HERO.heroArt,
  width: THUMBNAIL_WIDTH,
  height: Math.round(
    (VERIFYING_HERO.heroArt.height / VERIFYING_HERO.heroArt.width) *
      THUMBNAIL_WIDTH,
  ),
};

/** The identity-verification Rive; it plays through once, then holds. */
const IDENTITY_ANIMATION_THUMBNAIL = VERIFYING_HERO.heroAnimation ? (
  <MoneyVbaHomeCardHeroAnimation
    animation={VERIFYING_HERO.heroAnimation}
    fallback={VERIFYING_THUMBNAIL}
  />
) : undefined;

/** Where the can't-verify card's Learn more goes. */
const SUPPORT_URL = 'https://support.metamask.io';

/** How wide the X and the tick's visible artwork sit in the 72pt slot. */
const STATUS_GLYPH_SIZE = 56;
/**
 * The tick Rive's artboard carries its own empty margin, so the view is drawn
 * larger than the slot and the slot clips the margin away.
 */
const VERIFIED_RIVE_WIDTH = 126;

const CANT_VERIFY_THUMBNAIL = (
  <Image
    source={cantVerifyArt}
    style={{ width: STATUS_GLYPH_SIZE, height: STATUS_GLYPH_SIZE }}
    resizeMode="contain"
  />
);

/**
 * The green verified tick Rive (`card_verified_check.riv`): `Intro` plays
 * once, then holds. Its static art is the fallback.
 */
const VERIFIED_THUMBNAIL = (
  <MoneyVbaHomeCardHeroAnimation
    animation={{
      source: verifiedCheckAnimation,
      artboardName: 'Check',
      stateMachineName: 'State Machine 1',
    }}
    fallback={{
      source: kycVerifiedCheckArt,
      width: VERIFIED_RIVE_WIDTH,
      height: Math.round((107 / 140) * VERIFIED_RIVE_WIDTH),
    }}
  />
);

/**
 * What each card state shows. Only the states the flow continues from are
 * pressable, and only the terminal states (can't verify, verified) can be
 * dismissed. The get-started card is persistent.
 */
const CARD_STATE_CONFIG: Record<
  KalshiPrototypeCardState,
  {
    thumbnail?: BannerCompactProps['thumbnail'];
    isPressable: boolean;
    isDismissible: boolean;
  }
> = {
  getStarted: {
    thumbnail: IDENTITY_ANIMATION_THUMBNAIL,
    isPressable: true,
    // The entry card stays until the user starts: no close (Paper CB7-2).
    isDismissible: false,
  },
  needMoreInfo: {
    thumbnail: IDENTITY_ANIMATION_THUMBNAIL,
    isPressable: true,
    isDismissible: false,
  },
  stepUp: {
    thumbnail: IDENTITY_ANIMATION_THUMBNAIL,
    isPressable: true,
    isDismissible: false,
  },
  verifying: {
    // The Money home card's scanner Rive; its static art is the fallback.
    thumbnail: VERIFYING_HERO.heroAnimation ? (
      <MoneyVbaHomeCardHeroAnimation
        animation={VERIFYING_HERO.heroAnimation}
        fallback={VERIFYING_THUMBNAIL}
      />
    ) : undefined,
    isPressable: false,
    isDismissible: false,
  },
  cantVerify: {
    thumbnail: CANT_VERIFY_THUMBNAIL,
    // Learn more opens the support site, like the VBA can't-verify card.
    isPressable: true,
    isDismissible: true,
  },
  verified: {
    thumbnail: VERIFIED_THUMBNAIL,
    isPressable: false,
    isDismissible: true,
  },
};

interface KalshiPrototypeStatusCardProps {
  /** The verification state the prototype runtime reports. */
  state: KalshiPrototypeCardState;
  /**
   * Opens, or resumes, the flow. The tappable states call it; the rest
   * ignore it.
   */
  onPress?: () => void;
  /** Hides the card. The dismissible states show the close button for it. */
  onClose?: () => void;
  testID?: string;
}

/**
 * The prototype Predictions screen's status card: one compact row that shows
 * where the Kalshi verification stands and continues the flow from there.
 * The copy is placeholder, passed to the shared BannerCompact as props.
 *
 * @param props - The card state and the home's handlers.
 * @returns The card.
 */
const KalshiPrototypeStatusCard = ({
  state,
  onPress,
  onClose,
  testID = KalshiPrototypeStatusCardSelectorsIDs.CONTAINER,
}: KalshiPrototypeStatusCardProps) => {
  const copy = PROTOTYPE_COPY.card[state];
  const config = CARD_STATE_CONFIG[state];
  const handlePress =
    state === 'cantVerify' ? () => Linking.openURL(SUPPORT_URL) : onPress;

  return (
    <BannerCompact
      thumbnail={config.thumbnail}
      title={copy.title}
      description={copy.description}
      actionLabel={'action' in copy ? copy.action : undefined}
      onPress={config.isPressable ? handlePress : undefined}
      onClose={config.isDismissible ? onClose : undefined}
      testID={testID}
    />
  );
};

export default KalshiPrototypeStatusCard;
export { KalshiPrototypeStatusCardSelectorsIDs };
