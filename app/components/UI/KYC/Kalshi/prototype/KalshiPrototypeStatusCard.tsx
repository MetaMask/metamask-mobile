// PROTOTYPE-DO-NOT-MERGE
import React from 'react';
import BannerCompact, {
  type BannerCompactProps,
} from '../../../../../component-library/components-temp/BannerCompact';
import moneyVbaKycDecisionArt from '../../../../../images/money-vba-kyc-decision-art.png';
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
      width: THUMBNAIL_WIDTH,
      height: Math.round((107 / 140) * THUMBNAIL_WIDTH),
    }}
  />
);

/**
 * What each card state shows. Only the states the flow continues from are
 * pressable, and only the states that outlive a visit can be dismissed.
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
    isDismissible: true,
  },
  needMoreInfo: {
    thumbnail: IDENTITY_ANIMATION_THUMBNAIL,
    isPressable: true,
    isDismissible: false,
  },
  stepUp: {
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
    // The VBA can't-verify card's X.
    thumbnail: moneyVbaKycDecisionArt,
    isPressable: false,
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

  return (
    <BannerCompact
      thumbnail={config.thumbnail}
      title={copy.title}
      description={copy.description}
      actionLabel={'action' in copy ? copy.action : undefined}
      onPress={config.isPressable ? onPress : undefined}
      onClose={config.isDismissible ? onClose : undefined}
      testID={testID}
    />
  );
};

export default KalshiPrototypeStatusCard;
export { KalshiPrototypeStatusCardSelectorsIDs };
