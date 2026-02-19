import React, { useCallback, useMemo } from 'react';
import { View, Pressable, Image } from 'react-native';
import BigNumber from 'bignumber.js';
import { Hex } from '@metamask/utils';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import AvatarGroup from '../../../../../../../component-library/components/Avatars/AvatarGroup';
import Badge, {
  BadgeVariant,
} from '../../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../../component-library/components/Badges/BadgeWrapper';
import { AvatarProps } from '../../../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../../component-library/components/Avatars/Avatar';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../../hooks/useStyles';
import { strings } from '../../../../../../../../locales/i18n';
import {
  MUSD_CONVERSION_APY,
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '../../../../constants/musd';
import { getNetworkImageSource } from '../../../../../../../util/networks';
import styleSheet from './MusdBalanceCard.styles';
import { useMusdBalance } from '../../../../hooks/useMusdBalance';
import { useSelector } from 'react-redux';
import { selectNetworkConfigurations } from '../../../../../../../selectors/networkController';
import Routes from '../../../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';

/**
 * Test IDs for the MusdBalanceCard component.
 */
export const MusdBalanceCardTestIds = {
  CONTAINER: 'musd-balance-card',
  TOKEN_ICON: 'musd-token-icon',
} as const;

/**
 * Card displaying the user's aggregated mUSD balance across chains.
 * On press, navigates to the balances-by-network modal (when multiple chains).
 */
const MusdBalanceCard = () => {
  const { styles } = useStyles(styleSheet, {});

  const navigation = useNavigation();

  const {
    tokenBalanceByChain,
    fiatBalanceByChain,
    fiatBalanceAggregatedFormatted,
  } = useMusdBalance();

  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const percentChange = 0;

  const percentChangeFormatted =
    percentChange >= 0
      ? `+${percentChange.toFixed(2)}%`
      : `-${percentChange.toFixed(2)}%`;

  const percentChangeColor =
    percentChange >= 0 ? TextColor.Success : TextColor.Error;

  const orderedChainIdsWithMusdBalance = useMemo(() => {
    const chainIds = Object.keys(tokenBalanceByChain) as Hex[];

    return chainIds.sort((chainIdA, chainIdB) => {
      const fiatA = new BigNumber(fiatBalanceByChain[chainIdA] ?? 0);
      const fiatB = new BigNumber(fiatBalanceByChain[chainIdB] ?? 0);
      const fiatComparison = fiatB.comparedTo(fiatA);
      if (fiatComparison) {
        return fiatComparison;
      }

      const tokenA = new BigNumber(tokenBalanceByChain[chainIdA] ?? 0);
      const tokenB = new BigNumber(tokenBalanceByChain[chainIdB] ?? 0);
      return tokenB.comparedTo(tokenA) || 0;
    });
  }, [fiatBalanceByChain, tokenBalanceByChain]);

  const networkAvatarPropsList = useMemo(
    (): AvatarProps[] =>
      orderedChainIdsWithMusdBalance.map((chainId) => ({
        variant: AvatarVariant.Network,
        name: networkConfigurations?.[chainId]?.name ?? String(chainId),
        imageSource: getNetworkImageSource({ chainId }),
      })),
    [networkConfigurations, orderedChainIdsWithMusdBalance],
  );

  const singleNetworkImageSource = useMemo(() => {
    if (orderedChainIdsWithMusdBalance.length !== 1) {
      return undefined;
    }

    return getNetworkImageSource({
      chainId: orderedChainIdsWithMusdBalance[0],
    });
  }, [orderedChainIdsWithMusdBalance]);

  const handleOpenBalanceCard = useCallback(() => {
    navigation.navigate(Routes.EARN.MODALS.ROOT, {
      screen: Routes.EARN.MODALS.MUSD_BALANCES_BY_NETWORK,
    });
  }, [navigation]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed ? styles.containerPressed : undefined,
      ]}
      onPress={handleOpenBalanceCard}
      accessibilityRole="button"
      testID={MusdBalanceCardTestIds.CONTAINER}
      disabled={orderedChainIdsWithMusdBalance.length <= 1}
    >
      {/* Left side: Token icon and info (aggregated, no network icons) */}
      <View style={styles.left}>
        <View style={styles.tokenIconContainer}>
          {networkAvatarPropsList.length === 1 && singleNetworkImageSource ? (
            <BadgeWrapper
              badgePosition={BadgePosition.BottomRight}
              badgeElement={
                <Badge
                  variant={BadgeVariant.Network}
                  name={
                    networkConfigurations?.[orderedChainIdsWithMusdBalance[0]]
                      ?.name ?? ''
                  }
                  imageSource={singleNetworkImageSource}
                  isScaled={false}
                  size={AvatarSize.Xs}
                />
              }
            >
              <Image
                source={MUSD_TOKEN.imageSource}
                style={styles.tokenIcon}
                testID={MusdBalanceCardTestIds.TOKEN_ICON}
              />
            </BadgeWrapper>
          ) : (
            <Image
              source={MUSD_TOKEN.imageSource}
              style={styles.tokenIcon}
              testID={MusdBalanceCardTestIds.TOKEN_ICON}
            />
          )}
        </View>
        <View>
          <Text variant={TextVariant.BodyMDMedium}>
            {fiatBalanceAggregatedFormatted}
          </Text>
          {networkAvatarPropsList.length > 1 ? (
            <View style={styles.networkRow}>
              <AvatarGroup
                avatarPropsList={networkAvatarPropsList}
                size={AvatarSize.Sm}
                maxStackedAvatars={
                  Object.keys(MUSD_TOKEN_ADDRESS_BY_CHAIN).length
                }
                spaceBetweenAvatars={-10}
              />
              <Icon
                name={IconName.ArrowRight}
                color={IconColor.Default}
                size={IconSize.Sm}
              />
            </View>
          ) : (
            <Text
              variant={TextVariant.BodySMMedium}
              color={TextColor.Alternative}
            >
              {MUSD_TOKEN.symbol}
            </Text>
          )}
        </View>
      </View>

      {/* Right side: No boost and boost amount */}
      <View style={styles.right}>
        {/* TODO: Replace with actual boost value */}
        <Text variant={TextVariant.BodyMDMedium}>
          {strings('earn.musd_conversion.percentage_boost', {
            percentage: MUSD_CONVERSION_APY,
          })}
        </Text>
        <Text variant={TextVariant.BodySMMedium} color={percentChangeColor}>
          {percentChangeFormatted}
        </Text>
      </View>
    </Pressable>
  );
};

export default MusdBalanceCard;
