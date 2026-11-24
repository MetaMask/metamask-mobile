// PROTOTYPE-DO-NOT-MERGE
import React from 'react';
import BannerCompact from '../../../../../component-library/components-temp/BannerCompact';
import type { BannerCompactProps } from '../../../../../component-library/components-temp/BannerCompact';
import securityIllustration from '../../../../../images/secure_wallet_dark.png';
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
    thumbnail: securityIllustration,
    isPressable: true,
    isDismissible: true,
  },
  needMoreInfo: {
    isPressable: true,
    isDismissible: false,
  },
  verifying: {
    thumbnail: (
      <MoneyVbaHomeCardHeroAnimation
        animation={VERIFYING_HERO.heroAnimation}
        fallback={VERIFYING_THUMBNAIL}
      />
    ),
    isPressable: false,
    isDismissible: false,
  },
  cantVerify: {
    isPressable: false,
    isDismissible: true,
  },
  verified: {
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
