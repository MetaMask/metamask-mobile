import React, { useState, type ReactNode } from 'react';
import { Image, Linking, Pressable } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import { METAMASK_SUPPORT_URL } from '../../../../../../constants/urls';
import {
  type KalshiBannerState,
  useKalshiBannerState,
} from '../../../../KYC/Kalshi/kalshiBannerState';
import MoneyVbaHomeCardHeroAnimation from '../../../../Money/components/MoneyVbaHomeCard/MoneyVbaHomeCardHeroAnimation';
import { MONEY_VBA_HOME_CARD_CONFIG } from '../../../../Money/components/MoneyVbaHomeCard/MoneyVbaHomeCardConfig';
import { PredictNextRoutes } from '../../../navigation/routes';
import type { PredictNextStackParamList } from '../../../navigation/types';
import { PredictHomeTestIds } from '../PredictHome.testIds';
import cantVerifyArt from './assets/cant-verify-x.png';

/** The size of the art slot. The art sits directly on the card, and anything larger is clipped. */
const ART_SIZE = 72;

/** The scanner Rive the Money VBA card shows while KYC is under review. */
const IDENTITY_HERO = MONEY_VBA_HOME_CARD_CONFIG.kyc_pending;
const IDENTITY_FALLBACK = {
  ...IDENTITY_HERO.heroArt,
  width: ART_SIZE,
  height: Math.round(
    (IDENTITY_HERO.heroArt.height / IDENTITY_HERO.heroArt.width) * ART_SIZE,
  ),
};

const IDENTITY_ART = IDENTITY_HERO.heroAnimation ? (
  <MoneyVbaHomeCardHeroAnimation
    animation={IDENTITY_HERO.heroAnimation}
    fallback={IDENTITY_FALLBACK}
  />
) : undefined;

/** How large the can't-verify X sits in the 72pt art slot. */
const STATUS_GLYPH_SIZE = 56;

const CANT_VERIFY_ART = (
  <Image
    source={cantVerifyArt}
    style={{ width: STATUS_GLYPH_SIZE, height: STATUS_GLYPH_SIZE }}
    resizeMode="contain"
    accessible={false}
  />
);

/**
 * Per state: the art, the copy key (no action key means no button) and what
 * the banner allows. Only the states the flow continues from are pressable.
 * Only the can't-verify banner can be dismissed; the others go away once the
 * user is verified.
 */
const BANNER_STATE_CONFIG: Record<
  KalshiBannerState,
  {
    art?: ReactNode;
    copyKey: string;
    hasAction: boolean;
    isPressable: boolean;
    isDismissible: boolean;
  }
> = {
  getStarted: {
    art: IDENTITY_ART,
    copyKey: 'get_started',
    hasAction: true,
    isPressable: true,
    isDismissible: false,
  },
  needMoreInfo: {
    art: IDENTITY_ART,
    copyKey: 'need_more_info',
    hasAction: true,
    isPressable: true,
    isDismissible: false,
  },
  stepUp: {
    art: IDENTITY_ART,
    copyKey: 'step_up',
    hasAction: true,
    isPressable: true,
    isDismissible: false,
  },
  verifying: {
    art: IDENTITY_ART,
    copyKey: 'verifying',
    hasAction: false,
    isPressable: false,
    isDismissible: false,
  },
  cantVerify: {
    art: CANT_VERIFY_ART,
    copyKey: 'cant_verify',
    hasAction: true,
    // Learn more opens the support site; onboarding can't be restarted.
    isPressable: true,
    isDismissible: true,
  },
};

interface BannerRowProps {
  /** Decorative art for the 72pt slot. The slot is left out when it is missing. */
  art?: ReactNode;
  title: string;
  description: string;
  /** Small secondary button under the description. */
  actionLabel?: string;
  /** Called when the whole row is pressed. Without it the row is static. */
  onPress?: () => void;
  /** Hides the banner. Without it there is no close button. */
  onDismiss?: () => void;
}

/**
 * The banner's layout: a 72x72 art slot beside a title, a description and an
 * optional secondary button. The whole row is one press target when `onPress`
 * is given. The close button is laid over the row's top-right corner as a
 * sibling rather than nested inside it, because on Android a press on a nested
 * pressable can also press the row.
 */
const BannerRow = ({
  art,
  title,
  description,
  actionLabel,
  onPress,
  onDismiss,
}: BannerRowProps) => {
  const tw = useTailwind();
  const rowClasses =
    'flex-row items-start gap-4 rounded-xl bg-section px-4 py-3';

  const content = (
    <>
      {art === undefined || art === null ? null : (
        // The art is decorative, so it stays out of the accessibility tree.
        <Box
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          twClassName="h-18 w-18 shrink-0 items-center justify-center overflow-hidden rounded-lg"
        >
          {art}
        </Box>
      )}
      <Box twClassName="flex-1 gap-0.5">
        {/* pr-8 keeps the title clear of the close button over its row. */}
        <Text
          fontWeight={FontWeight.Medium}
          twClassName={onDismiss ? 'pr-8' : undefined}
          variant={TextVariant.BodyMd}
        >
          {title}
        </Text>
        <Text color={TextColor.TextAlternative} variant={TextVariant.BodySm}>
          {description}
        </Text>
        {actionLabel ? (
          // The row is the one press target, so the button only shows the
          // action and passes touches through to it.
          <Box twClassName="mt-2 self-start" pointerEvents="none">
            <Button variant={ButtonVariant.Secondary} size={ButtonSize.Sm}>
              {actionLabel}
            </Button>
          </Box>
        ) : null}
      </Box>
    </>
  );

  return (
    <Box>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel ? `${title}, ${actionLabel}` : title}
          onPress={onPress}
          style={({ pressed }) => tw.style(rowClasses, pressed && 'opacity-80')}
          testID={PredictHomeTestIds.GET_STARTED_BANNER}
        >
          {content}
        </Pressable>
      ) : (
        <Box
          twClassName={rowClasses}
          testID={PredictHomeTestIds.GET_STARTED_BANNER}
        >
          {content}
        </Box>
      )}
      {onDismiss ? (
        <ButtonIcon
          accessibilityLabel={strings('navigation.close')}
          iconName={IconName.Close}
          onPress={onDismiss}
          size={ButtonIconSize.Sm}
          testID={PredictHomeTestIds.GET_STARTED_BANNER_DISMISS}
          twClassName="absolute right-4 top-3"
        />
      ) : null}
    </Box>
  );
};

/**
 * Home's banner for the user's Kalshi account. It follows the vendor step and
 * status kyc-api reports: it invites the user in, resumes the flow, shows the
 * review is pending or that Kalshi can't verify them, and renders nothing once
 * identity is approved.
 *
 * Asks kyc-api each time the screen gains focus, so a user who finished on
 * another device, before a reinstall, or in the onboarding flow sees where
 * they really are.
 */
export const GetStartedBanner = () => {
  const bannerState = useKalshiBannerState();
  const navigation =
    useNavigation<NativeStackNavigationProp<PredictNextStackParamList>>();
  // Hides the can't-verify banner for this visit once the user closes it.
  const [isCantVerifyDismissed, setIsCantVerifyDismissed] = useState(false);

  if (
    bannerState === null ||
    (bannerState === 'cantVerify' && isCantVerifyDismissed)
  ) {
    return null;
  }

  const config = BANNER_STATE_CONFIG[bannerState];
  const copyPath = `predict_next.get_started_banner.${config.copyKey}`;
  const handlePress =
    bannerState === 'cantVerify'
      ? () => Linking.openURL(METAMASK_SUPPORT_URL)
      : () => navigation.navigate(PredictNextRoutes.KALSHI_ONBOARDING);

  return (
    <BannerRow
      art={config.art}
      title={strings(`${copyPath}.title`)}
      description={strings(`${copyPath}.description`)}
      actionLabel={config.hasAction ? strings(`${copyPath}.action`) : undefined}
      onPress={config.isPressable ? handlePress : undefined}
      onDismiss={
        config.isDismissible ? () => setIsCantVerifyDismissed(true) : undefined
      }
    />
  );
};
