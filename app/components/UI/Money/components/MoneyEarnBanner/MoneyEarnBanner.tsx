import React, { useCallback } from 'react';
import {
  Image,
  ImageSourcePropType,
  ImageStyle,
  Pressable,
  StyleProp,
  StyleSheet,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
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
import Routes from '../../../../../constants/navigation/Routes';
import { setMoneyEarnBannerDismissed } from '../../../../../actions/user';
import {
  selectMoneyEarnBannerDismissedTokens,
  selectMoneyOnboardingSeen,
} from '../../../../../reducers/user/selectors';
import { selectMoneyOnboardingStepperAnimationEnabled } from '../../../../../selectors/featureFlagController/moneyAccount';
import Logger from '../../../../../util/Logger';
import { TokenI } from '../../../Tokens/types';
import {
  getTokenDisplaySymbol,
  isMusdToken,
} from '../../../Earn/constants/musd';
import { isTokenInWildcardList } from '../../../Earn/utils/wildcardTokenList';
import { safeFormatChainIdToHex } from '../../../Card/util/safeFormatChainIdToHex';
import {
  selectMoneyEarnBannerTokens,
  selectMoneyEnableMoneyAccountFlag,
} from '../../selectors/featureFlags';
import { selectIsMoneyAccountGeoEligible } from '../../selectors/eligibility';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
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
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { apyPercent } = useMoneyAccountBalance();
  const { initiateDeposit } = useMoneyAccountDeposit();
  const hasSeenOnboarding = useSelector(selectMoneyOnboardingSeen);
  const isOnboardingEnabled = useSelector(
    selectMoneyOnboardingStepperAnimationEnabled,
  );

  const handlePress = useCallback(async () => {
    if (!hasSeenOnboarding && isOnboardingEnabled) {
      navigation.navigate(Routes.MONEY.ONBOARDING);
      return;
    }

    try {
      await initiateDeposit({
        preferredPaymentToken: {
          address: asset.address as Hex,
          chainId: safeFormatChainIdToHex(asset.chainId as string) as Hex,
        },
      });
    } catch (error) {
      Logger.error(
        error as Error,
        '[MoneyEarnBanner] Failed to initiate Money account deposit',
      );
    }
  }, [
    asset.address,
    asset.chainId,
    hasSeenOnboarding,
    initiateDeposit,
    isOnboardingEnabled,
    navigation,
  ]);

  const handleDismiss = useCallback(() => {
    dispatch(setMoneyEarnBannerDismissed(tokenKey));
  }, [dispatch, tokenKey]);

  const showApy = isPositiveNumber(apyPercent);
  const title = showApy
    ? strings('money.earn_banner.title', { apy: apyPercent })
    : strings('money.earn_banner.title_no_apy');
  const symbol =
    getTokenDisplaySymbol(asset.address, asset.symbol) ?? asset.symbol;
  const sourceTokenImage = getSourceTokenImage(asset);

  return (
    <Pressable onPress={handlePress} testID={MoneyEarnBannerTestIds.CONTAINER}>
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
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.PrimaryDefault}
            testID={MoneyEarnBannerTestIds.CTA}
          >
            {strings('money.earn_banner.cta', { symbol })}
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
};

const MoneyEarnBanner = ({ asset }: MoneyEarnBannerProps) => {
  const isMoneyAccountEnabled = useSelector(selectMoneyEnableMoneyAccountFlag);
  const isGeoEligible = useSelector(selectIsMoneyAccountGeoEligible);
  const earnBannerTokens = useSelector(selectMoneyEarnBannerTokens);
  const dismissedTokens = useSelector(selectMoneyEarnBannerDismissedTokens);

  if (!isMoneyAccountEnabled || !isGeoEligible) {
    return null;
  }

  if (!asset.address || !asset.chainId) {
    return null;
  }

  const chainIdHex = safeFormatChainIdToHex(asset.chainId);
  const isSupportedToken = isTokenInWildcardList(
    asset.symbol,
    earnBannerTokens,
    chainIdHex,
  );
  if (!isSupportedToken) {
    return null;
  }

  const tokenKey = `${chainIdHex}-${asset.address.toLowerCase()}`;
  if (dismissedTokens[tokenKey]) {
    return null;
  }

  return <MoneyEarnBannerContent asset={asset} tokenKey={tokenKey} />;
};

export default MoneyEarnBanner;
