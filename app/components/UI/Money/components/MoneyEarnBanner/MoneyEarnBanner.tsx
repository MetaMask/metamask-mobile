import React, { useCallback } from 'react';
import {
  Image,
  ImageSourcePropType,
  ImageStyle,
  Pressable,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { useDispatch } from 'react-redux';
import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { Hex } from '@metamask/utils';
import moneyEarnBannerArrow from '../../../../../images/money-earn-banner-arrow.png';
import moneyEarnBannerCoin from '../../../../../images/money-earn-banner-coin.png';
import moneyEarnBannerMusd from '../../../../../images/money-earn-banner-musd.png';
import moneyEarnBannerUsdc from '../../../../../images/money-earn-banner-usdc.png';
import moneyEarnBannerUsdt from '../../../../../images/money-earn-banner-usdt.png';
import moneyEarnBannerDai from '../../../../../images/money-earn-banner-dai.png';
import moneyEarnBannerAusdc from '../../../../../images/money-earn-banner-ausdc.png';
import moneyEarnBannerAusdt from '../../../../../images/money-earn-banner-ausdt.png';
import moneyEarnBannerAdai from '../../../../../images/money-earn-banner-adai.png';
import { strings } from '../../../../../../locales/i18n';
import { setMoneyEarnBannerDismissed } from '../../../../../actions/user';
import Logger from '../../../../../util/Logger';
import { TokenI } from '../../../Tokens/types';
import {
  getTokenDisplaySymbol,
  isMusdToken,
} from '../../../Earn/constants/musd';
import { safeFormatChainIdToHex } from '../../../Card/util/safeFormatChainIdToHex';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { useMoneyCtaVisibility } from '../../hooks/useMoneyCtaVisibility';
import { useMoneyOnboardingNavigation } from '../../hooks/useMoneyNavigation';
import { isPositiveNumber } from '../../utils/number';
import { MoneyEarnBannerTestIds } from './MoneyEarnBanner.testIds';

const styles = StyleSheet.create({
  iconContainer: {
    width: 72,
    height: 72,
    overflow: 'hidden',
  },
  tokenAvatar: {
    position: 'absolute',
    top: 8,
    left: 2,
  },
  musdImage: {
    position: 'absolute',
    top: 2,
    left: -5,
    width: 43,
    height: 43,
  },
  usdcImage: {
    position: 'absolute',
    top: 6,
    left: 0,
    width: 37,
    height: 39,
  },
  usdtImage: {
    position: 'absolute',
    top: 7,
    left: 1,
    width: 34,
    height: 37,
  },
  daiImage: {
    position: 'absolute',
    top: 7,
    left: 0,
    width: 36,
    height: 37,
  },
  ausdcImage: {
    position: 'absolute',
    top: 8,
    left: 3,
    width: 34,
    height: 34,
  },
  ausdtImage: {
    position: 'absolute',
    top: 8,
    left: 1,
    width: 33,
    height: 33,
  },
  adaiImage: {
    position: 'absolute',
    top: 8,
    left: 1,
    width: 34,
    height: 34,
  },
  arrowImage: {
    position: 'absolute',
    top: 4,
    left: 30,
    width: 32,
    height: 30,
  },
  coinImage: {
    position: 'absolute',
    top: 35,
    left: 40,
    width: 28,
    height: 33,
  },
  ctaButton: {
    alignSelf: 'flex-start',
  } as ViewStyle,
});

interface SourceTokenImage {
  source: ImageSourcePropType;
  style: StyleProp<ImageStyle>;
}

const SOURCE_TOKEN_IMAGES: Record<string, SourceTokenImage> = {
  USDC: { source: moneyEarnBannerUsdc, style: styles.usdcImage },
  USDT: { source: moneyEarnBannerUsdt, style: styles.usdtImage },
  DAI: { source: moneyEarnBannerDai, style: styles.daiImage },
  AUSDC: { source: moneyEarnBannerAusdc, style: styles.ausdcImage },
  AUSDT: { source: moneyEarnBannerAusdt, style: styles.ausdtImage },
  ADAI: { source: moneyEarnBannerAdai, style: styles.adaiImage },
  AUSDCN: { source: moneyEarnBannerAusdc, style: styles.ausdcImage },
};

const getSourceTokenImage = (asset: TokenI): SourceTokenImage | undefined => {
  if (isMusdToken(asset.address)) {
    return { source: moneyEarnBannerMusd, style: styles.musdImage };
  }
  return SOURCE_TOKEN_IMAGES[asset.symbol?.toUpperCase() ?? ''];
};

interface MoneyEarnBannerProps {
  asset: TokenI;
}

interface MoneyEarnBannerContentProps {
  asset: TokenI;
  tokenKey: string;
}

const MoneyEarnBannerContent = ({
  asset,
  tokenKey,
}: MoneyEarnBannerContentProps) => {
  const dispatch = useDispatch();
  const { apyPercent } = useMoneyAccountBalance();
  const { initiateDeposit } = useMoneyAccountDeposit();
  const { redirectToOnboardingIfNeeded } = useMoneyOnboardingNavigation();
  const { trackButtonClicked, trackSurfaceClicked } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.ASSET_DETAIL,
    component_name: COMPONENT_NAMES.MONEY_EARN_BANNER,
  });

  const symbol =
    getTokenDisplaySymbol(asset.address, asset.symbol) ?? asset.symbol;
  const ctaLabel = strings('money.earn_banner.cta', { symbol });

  const beginAddFunds = useCallback((): boolean => {
    const preferredPaymentToken = {
      address: asset.address as Hex,
      chainId: safeFormatChainIdToHex(asset.chainId as string) as Hex,
    };

    const redirectedToOnboarding = redirectToOnboardingIfNeeded({
      preferredPaymentToken,
    });
    if (!redirectedToOnboarding) {
      initiateDeposit({ preferredPaymentToken }).catch((error) => {
        Logger.error(
          error as Error,
          '[MoneyEarnBanner] Failed to initiate Money account deposit',
        );
      });
    }

    return redirectedToOnboarding;
  }, [
    asset.address,
    asset.chainId,
    initiateDeposit,
    redirectToOnboardingIfNeeded,
  ]);

  const handleBannerPress = useCallback(() => {
    const redirectedToOnboarding = beginAddFunds();

    trackSurfaceClicked({
      redirect_target: redirectedToOnboarding
        ? SCREEN_NAMES.MONEY_ONBOARDING
        : SCREEN_NAMES.MONEY_DEPOSIT,
    });
  }, [beginAddFunds, trackSurfaceClicked]);

  const handleCtaPress = useCallback(() => {
    const redirectedToOnboarding = beginAddFunds();

    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: redirectedToOnboarding
        ? MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING
        : MONEY_BUTTON_INTENTS.ADD_MONEY,
      label_en: ctaLabel,
      label_localized: ctaLabel,
      redirect_target: redirectedToOnboarding
        ? SCREEN_NAMES.MONEY_ONBOARDING
        : SCREEN_NAMES.MONEY_DEPOSIT,
    });
  }, [beginAddFunds, ctaLabel, trackButtonClicked]);

  const handleDismiss = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.ICON,
      button_intent: MONEY_BUTTON_INTENTS.DISMISS,
    });
    dispatch(setMoneyEarnBannerDismissed(tokenKey));
  }, [dispatch, tokenKey, trackButtonClicked]);

  const showApy = isPositiveNumber(apyPercent);
  const title = showApy
    ? strings('money.earn_banner.title', { apy: apyPercent })
    : strings('money.earn_banner.title_no_apy');
  const sourceTokenImage = getSourceTokenImage(asset);

  return (
    <Pressable
      onPress={handleBannerPress}
      testID={MoneyEarnBannerTestIds.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="mx-4 mt-4 gap-4 rounded-xl bg-muted px-4 py-3"
      >
        <Box
          style={styles.iconContainer}
          testID={MoneyEarnBannerTestIds.TOKEN_ICON}
        >
          {sourceTokenImage ? (
            <Image
              source={sourceTokenImage.source}
              style={sourceTokenImage.style}
              testID={MoneyEarnBannerTestIds.SOURCE_TOKEN_IMAGE}
            />
          ) : (
            <AvatarToken
              name={asset.symbol}
              src={{ uri: asset.image }}
              size={AvatarTokenSize.Md}
              style={styles.tokenAvatar}
            />
          )}
          <Image source={moneyEarnBannerArrow} style={styles.arrowImage} />
          <Image source={moneyEarnBannerCoin} style={styles.coinImage} />
        </Box>
        <Box twClassName="flex-1">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
          >
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Bold}
              twClassName="flex-1"
              testID={MoneyEarnBannerTestIds.TITLE}
            >
              {title}
            </Text>
            <ButtonIcon
              iconName={IconName.Close}
              size={ButtonIconSize.Sm}
              onPress={handleDismiss}
              testID={MoneyEarnBannerTestIds.CLOSE_BUTTON}
            />
          </Box>
          <Text
            variant={TextVariant.BodySm}
            testID={MoneyEarnBannerTestIds.DESCRIPTION}
          >
            {strings('money.earn_banner.description', { symbol })}
          </Text>
          <TouchableOpacity
            onPress={handleCtaPress}
            style={styles.ctaButton}
            testID={MoneyEarnBannerTestIds.CTA}
          >
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.PrimaryDefault}
            >
              {ctaLabel}
            </Text>
          </TouchableOpacity>
        </Box>
      </Box>
    </Pressable>
  );
};

const MoneyEarnBanner = ({ asset }: MoneyEarnBannerProps) => {
  const { shouldShowMoneyEarnBanner } = useMoneyCtaVisibility();

  if (!asset.address || !asset.chainId || !shouldShowMoneyEarnBanner(asset)) {
    return null;
  }

  const tokenKey = `${safeFormatChainIdToHex(asset.chainId)}-${asset.address.toLowerCase()}`;
  return <MoneyEarnBannerContent asset={asset} tokenKey={tokenKey} />;
};

export default MoneyEarnBanner;
