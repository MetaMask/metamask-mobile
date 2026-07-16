import React, { useCallback } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
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
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import moneyEarnBannerArrow from '../../../../../images/money-earn-banner-arrow.png';
import moneyEarnBannerCoin from '../../../../../images/money-earn-banner-coin.png';
import { strings } from '../../../../../../locales/i18n';
import { setMoneyEarnBannerDismissed } from '../../../../../actions/user';
import { selectMoneyEarnBannerDismissedTokens } from '../../../../../reducers/user/selectors';
import { selectRelayFixedSpread } from '../../../../../selectors/featureFlagController/confirmations';
import { isSubsidizedRoute } from '../../../../Views/confirmations/utils/relayFixedSpread';
import Logger from '../../../../../util/Logger';
import { TokenI } from '../../../Tokens/types';
import {
  MUSD_TOKEN_ADDRESS,
  getTokenDisplaySymbol,
} from '../../../Earn/constants/musd';
import { safeFormatChainIdToHex } from '../../../Card/util/safeFormatChainIdToHex';
import { selectMoneyEnableMoneyAccountFlag } from '../../selectors/featureFlags';
import { selectIsMoneyAccountGeoEligible } from '../../selectors/eligibility';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { isPositiveNumber } from '../../utils/number';
import { MoneyEarnBannerTestIds } from './MoneyEarnBanner.testIds';

const MONAD_MUSD_TARGET = {
  address: MUSD_TOKEN_ADDRESS,
  chainId: CHAIN_IDS.MONAD,
};

const styles = StyleSheet.create({
  iconContainer: {
    width: 56,
    height: 56,
  },
  tokenAvatar: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  arrowImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 32,
    height: 30,
  },
  coinImage: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 30,
  },
});

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

  const handlePress = useCallback(async () => {
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
  }, [asset.address, asset.chainId, initiateDeposit]);

  const handleDismiss = useCallback(() => {
    dispatch(setMoneyEarnBannerDismissed(tokenKey));
  }, [dispatch, tokenKey]);

  const showApy = isPositiveNumber(apyPercent);
  const title = showApy
    ? strings('money.earn_banner.title', { apy: apyPercent })
    : strings('money.earn_banner.title_no_apy');
  const symbol =
    getTokenDisplaySymbol(asset.address, asset.symbol) ?? asset.symbol;

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
          <AvatarToken
            name={asset.symbol}
            src={{ uri: asset.image }}
            size={AvatarTokenSize.Md}
            style={styles.tokenAvatar}
          />
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
            color={TextColor.TextAlternative}
            testID={MoneyEarnBannerTestIds.DESCRIPTION}
          >
            {strings('money.earn_banner.description', { symbol })}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.PrimaryDefault}
            twClassName="mt-1"
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
  const relayFixedSpread = useSelector(selectRelayFixedSpread);
  const dismissedTokens = useSelector(selectMoneyEarnBannerDismissedTokens);

  if (!isMoneyAccountEnabled || !isGeoEligible) {
    return null;
  }

  if (!asset.address || !asset.chainId) {
    return null;
  }

  const chainIdHex = safeFormatChainIdToHex(asset.chainId);
  const isSupportedDepositSource = isSubsidizedRoute(
    relayFixedSpread,
    {
      address: asset.address,
      chainId: chainIdHex,
    },
    MONAD_MUSD_TARGET,
  );
  if (!isSupportedDepositSource) {
    return null;
  }

  const tokenKey = `${chainIdHex}-${asset.address.toLowerCase()}`;
  if (dismissedTokens[tokenKey]) {
    return null;
  }

  return <MoneyEarnBannerContent asset={asset} tokenKey={tokenKey} />;
};

export default MoneyEarnBanner;
