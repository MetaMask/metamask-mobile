import React, { useCallback, useMemo } from 'react';
import {
  View,
  SectionList,
  StyleSheet,
  Image,
  Pressable,
  ViewStyle,
  Linking,
} from 'react-native';
import { useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Hex } from '@metamask/utils';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import AvatarGroup from '../../../../../component-library/components/Avatars/AvatarGroup';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import { AvatarProps } from '../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../hooks/useStyles';
import { strings } from '../../../../../../locales/i18n';
import { getStakingNavbar } from '../../../Navbar';
import { AssetType } from '../../../../Views/confirmations/types/token';
import { useMusdConversionTokens } from '../../hooks/useMusdConversionTokens';
import { useMusdConversion } from '../../hooks/useMusdConversion';
import {
  selectIsMusdConversionFlowEnabledFlag,
  selectMusdQuickConvertEnabledFlag,
} from '../../selectors/featureFlags';
import ConvertTokenRow from '../../components/Musd/ConvertTokenRow';
import styleSheet from './MusdQuickConvertView.styles';
import { MusdQuickConvertViewTestIds } from './MusdQuickConvertView.types';
import Tag from '../../../../../component-library/components/Tags/Tag';
import { TagProps } from '../../../../../component-library/components/Tags/Tag/Tag.types';
import {
  MUSD_CONVERSION_APY,
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '../../constants/musd';
import AppConstants from '../../../../../core/AppConstants';
import { useMusdBalance } from '../../hooks/useMusdBalance';
import Routes from '../../../../../constants/navigation/Routes';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { getNetworkImageSource } from '../../../../../util/networks';

const musdBalanceStyles = () =>
  StyleSheet.create({
    container: {
      width: '100%',
      justifyContent: 'space-between',
      flexDirection: 'row',
    },
    containerPressed: {
      opacity: 0.7,
    },
    left: {
      flexDirection: 'row',
      gap: 16,
    },
    right: {
      alignItems: 'flex-end',
    },
    networkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    tokenIconContainer: {
      width: 32,
      height: 32,
      position: 'relative',
    },
    tokenIcon: {
      width: 32,
      height: 32,
    },
  });

interface MusdBalanceCardProps {
  style?: ViewStyle;
}

const MusdBalanceCard = ({ style }: MusdBalanceCardProps) => {
  const { styles } = useStyles(musdBalanceStyles, {});
  const navigation = useNavigation();

  const {
    fiatBalanceAggregatedFormatted,
    tokenBalanceByChain,
    fiatBalanceByChain,
  } = useMusdBalance();
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const percentChange = 0;

  const percentChangeFormatted =
    percentChange >= 0
      ? `+${percentChange.toFixed(2)}%`
      : `-${percentChange.toFixed(2)}%`;

  const percentChangeColor =
    percentChange >= 0 ? TextColor.Success : TextColor.Error;

  const handleOpen = useCallback(() => {
    navigation.navigate(Routes.EARN.MODALS.ROOT, {
      screen: Routes.EARN.MODALS.MUSD_BALANCES_BY_NETWORK,
    });
  }, [navigation]);

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

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        style,
        pressed ? styles.containerPressed : undefined,
      ]}
      onPress={handleOpen}
      accessibilityRole="button"
      testID="musd-balance-card"
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
                      ?.name
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
                testID="musd-token-icon"
              />
            </BadgeWrapper>
          ) : (
            <Image
              source={MUSD_TOKEN.imageSource}
              style={styles.tokenIcon}
              testID="musd-token-icon"
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

interface SectionHeaderProps {
  title: string;
  tag?: TagProps;
}

const SectionHeader = ({ title, tag }: SectionHeaderProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.listHeaderContainer}>
      <Text variant={TextVariant.BodyMDMedium}>{title}</Text>
      {tag && <Tag {...tag} />}
    </View>
  );
};

interface TokenSection {
  title: string;
  tag?: TagProps;
  data: AssetType[];
}

/**
 * Quick Convert Token List screen.
 *
 * Displays all convertible tokens the user holds with Max and Edit buttons.
 * - Max: Opens a bottom sheet for quick full-balance conversion
 * - Edit: Navigates to the existing custom amount confirmation screen
 */
const MusdQuickConvertView = () => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;
  const navigation = useNavigation();
  const { initiateCustomConversion, initiateMaxConversion } =
    useMusdConversion();

  // Feature flags
  const isMusdFlowEnabled = useSelector(selectIsMusdConversionFlowEnabledFlag);
  const isQuickConvertEnabled = useSelector(selectMusdQuickConvertEnabledFlag);

  // Get convertible tokens
  const { tokens: conversionTokens } = useMusdConversionTokens();

  // Set up navigation header
  useFocusEffect(
    useCallback(() => {
      navigation.setOptions(
        getStakingNavbar('', navigation, colors, {
          hasCancelButton: false,
        }),
      );
    }, [navigation, colors]),
  );

  // navigate to max conversion bottom sheet
  const handleMaxPress = useCallback(
    async (token: AssetType) => {
      if (!token.rawBalance) {
        // TODO: Handle error instead of returning silently.
        return;
      }

      await initiateMaxConversion(token);
    },
    [initiateMaxConversion],
  );

  // navigate to existing confirmation screen
  const handleEditPress = useCallback(
    async (token: AssetType) => {
      await initiateCustomConversion({
        preferredPaymentToken: {
          address: token.address as Hex,
          chainId: token.chainId as Hex,
        },
      });
    },
    [initiateCustomConversion],
  );

  const tokensWithBalance = useMemo(
    () =>
      conversionTokens.filter(
        (token) => token.rawBalance && token.rawBalance !== '0x0',
      ),
    [conversionTokens],
  );

  // Keep this as a SectionList even while we only have one section today.
  // In the near future we'll add additional sections (e.g. non-stablecoins) below.
  const tokenSections = useMemo<TokenSection[]>(() => {
    if (tokensWithBalance.length === 0) {
      return [];
    }

    return [
      {
        title: strings('earn.your_stablecoins'),
        data: tokensWithBalance,
      },
    ];
  }, [tokensWithBalance]);

  // Render individual token row
  const renderTokenItem = useCallback(
    ({ item }: { item: AssetType }) => (
      <ConvertTokenRow
        token={item}
        onMaxPress={handleMaxPress}
        onEditPress={handleEditPress}
      />
    ),
    [handleMaxPress, handleEditPress],
  );

  // TODO: This may be the same as the createTokenChainKey util. If yes, replace with createTokenChainKey call.
  // Key extractor for SectionList
  const keyExtractor = useCallback(
    (item: AssetType) => `${item.address}-${item.chainId}`,
    [],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: TokenSection }) => (
      <SectionHeader title={section.title} tag={section.tag} />
    ),
    [],
  );

  // Ideally users can't get to the quick convert view if they don't have any tokens to convert.
  const renderEmptyState = () => (
    <View
      style={styles.emptyContainer}
      testID={MusdQuickConvertViewTestIds.EMPTY_STATE}
    >
      <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
        {strings('earn.musd_conversion.no_tokens_to_convert')}
      </Text>
    </View>
  );

  const handleTermsOfUsePressed = useCallback(() => {
    Linking.openURL(AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE);
  }, []);

  // If feature flags are not enabled, don't render
  if (!isMusdFlowEnabled || !isQuickConvertEnabled) {
    return null;
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['bottom']}
      testID={MusdQuickConvertViewTestIds.CONTAINER}
    >
      {/* Header section */}
      <View
        style={styles.headerContainer}
        testID={MusdQuickConvertViewTestIds.HEADER}
      >
        <View style={styles.headerTextContainer}>
          <Text variant={TextVariant.HeadingLG}>
            {strings('earn.musd_conversion.quick_convert.title', {
              apy: MUSD_CONVERSION_APY,
            })}
          </Text>
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {strings('earn.musd_conversion.quick_convert.subtitle', {
              apy: MUSD_CONVERSION_APY,
            })}{' '}
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Alternative}
              style={styles.termsApply}
              onPress={handleTermsOfUsePressed}
            >
              {strings('earn.musd_conversion.education.terms_apply')}
            </Text>
          </Text>
        </View>
        <View>
          <Text
            variant={TextVariant.BodyMDMedium}
            style={styles.balanceCardHeader}
          >
            {strings('earn.musd_conversion.your_musd')}
          </Text>
          <MusdBalanceCard
            // TODO: Child component should have its own stylesheet.
            style={styles.balanceCardContainer}
          />
        </View>
      </View>

      {/* Token list */}
      <SectionList<AssetType, TokenSection>
        style={styles.listContainer}
        sections={tokenSections}
        renderItem={renderTokenItem}
        keyExtractor={keyExtractor}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        testID={MusdQuickConvertViewTestIds.TOKEN_LIST}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
};

export default MusdQuickConvertView;
