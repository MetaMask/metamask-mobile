import React, { useCallback, useMemo } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet, Image, ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Hex } from '@metamask/utils';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
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
import { MUSD_CONVERSION_APY, MUSD_TOKEN } from '../../constants/musd';
import { Theme } from '../../../../../util/theme/models';
import { useMusdBalance } from '../../hooks/useMusdBalance';
import BadgeWrapper, { BadgePosition } from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, { BadgeVariant } from '../../../../../component-library/components/Badges/Badge';
import { getNetworkImageSource } from '../../../../../util/networks';
import { CHAIN_IDS } from '@metamask/transaction-controller';


const musdBadgeStyles = (params: { theme: Theme, vars: { size: number } }) => {
  const { theme, vars: { size } } = params;

  return {
    tokenIcon: {
      width: size,
      height: size,
    },
    badgeWrapper: {
      alignSelf: 'center',
    },
  } as const;
};

interface MusdBadgeProps {
  chainId: string;
  size?: number;
}

const MusdBadge = ({ chainId, size = 16 }: MusdBadgeProps) => {
  const { styles } = useStyles(musdBadgeStyles, { size });

  const networkImageSource = getNetworkImageSource({ chainId });

  return (
    <BadgeWrapper
      style={styles.badgeWrapper}
      badgePosition={BadgePosition.BottomRight}
      badgeElement={
        <Badge
          variant={BadgeVariant.Network}
          imageSource={networkImageSource}
        />
      }
    >
      <Image
        source={MUSD_TOKEN.imageSource}
        style={styles.tokenIcon}
        testID="musd-token-icon"
      />
    </BadgeWrapper>
  );
};

const musdBalanceStyles = () => StyleSheet.create({
  container: {
    width: '100%',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  left: {
    flexDirection: 'row',
    gap: 16,
  },
  right: {
    alignItems: 'flex-end',
  }
});


interface MusdBalanceCardProps {
  chainId: Hex;
  style?: ViewStyle;
}

const MusdBalanceCard = ({ chainId, style }: MusdBalanceCardProps) => {
  const { styles } = useStyles(musdBalanceStyles, {});

  const { balancesByChain } = useMusdBalance();

  // TODO: Currency must be formatted using the user's currency.
  const musdBalance = useMemo(() => balancesByChain?.[chainId] ?? '$0.00', [balancesByChain, chainId]);

  // TODO: Replace with actual percent change value.
  const percentChange = 0.10;
  const percentChangeFormatted = percentChange > 0 ? `+${percentChange}` : `-${percentChange}`;
  const percentChangeColor = percentChange > 0 ? TextColor.Success : TextColor.Error;

  return (
    <View style={[styles.container, style]}>
      {/* Left side: Token icon and info */}
      <View style={styles.left}>
        <MusdBadge chainId={chainId} size={32} />
        <View>
          <Text variant={TextVariant.BodyMDMedium}>{musdBalance}</Text>
          <Text variant={TextVariant.BodySMMedium} color={TextColor.Alternative}>{MUSD_TOKEN.symbol}</Text>
        </View>
        <View>

        </View>
      </View>
      {/* Right side: No boost and boost amount */}
      <View style={styles.right}>
        {/* TODO: Replace with actual boost copy. */}
        <Text variant={TextVariant.BodyMDMedium}>{strings('earn.musd_conversion.no_boost')}</Text>
        <Text variant={TextVariant.BodySMMedium} color={percentChangeColor}>{percentChangeFormatted}</Text>
      </View>
    </View>

  );
};

// TODO: Breakout
interface TokenListDividerProps {
  title: string;
  tag?: TagProps;
}

const SectionHeader = ({ title, tag }: TokenListDividerProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.listHeaderContainer}>
      <Text variant={TextVariant.BodyMDMedium}>{title}</Text>
      {tag && <Tag {...tag} />}
    </View>
  );
};

/**
 * Quick Convert Token List screen.
 *
 * Displays all convertible tokens the user holds with Max and Edit buttons.
 * - Max: Opens a bottom sheet for quick full-balance conversion
 * - Edit: Navigates to the existing custom amount confirmation screen
 */
// TODO: Update header to match latest designs.
// TODO: Update Top Banner
const MusdQuickConvertView = () => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;
  const navigation = useNavigation();
  const { initiateCustomConversion, initiateMaxConversion } =
    useMusdConversion();
  const { getMusdOutputChainId } = useMusdConversionTokens();

  // Feature flags
  const isMusdFlowEnabled = useSelector(selectIsMusdConversionFlowEnabledFlag);
  const isQuickConvertEnabled = useSelector(selectMusdQuickConvertEnabledFlag);

  // Get convertible tokens
  const { tokens: conversionTokens } = useMusdConversionTokens();

  // Set up navigation header
  useFocusEffect(
    useCallback(() => {
      navigation.setOptions(
        getStakingNavbar(
          strings('earn.musd_conversion.convert_to_musd'),
          navigation,
          colors,
        ),
      );
    }, [navigation, colors]),
  );

  // navigate to max conversion bottom sheet
  const handleMaxPress = useCallback(
    async (token: AssetType) => {
      if (!token.rawBalance) {
        return;
      }
      await initiateMaxConversion(token);
    },
    [initiateMaxConversion],
  );

  // navigate to existing confirmation screen
  const handleEditPress = useCallback(
    async (token: AssetType) => {
      const outputChainId = getMusdOutputChainId(token.chainId);

      await initiateCustomConversion({
        outputChainId,
        preferredPaymentToken: {
          address: token.address as Hex,
          chainId: token.chainId as Hex,
        },
      });
    },
    [initiateCustomConversion, getMusdOutputChainId],
  );

  const tokensWithBalance = useMemo(
    () =>
      conversionTokens.filter(
        (token) => token.rawBalance && token.rawBalance !== '0x0',
      ),
    [conversionTokens],
  );

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
  // Key extractor for FlatList
  const keyExtractor = useCallback(
    (item: AssetType) => `${item.address}-${item.chainId}`,
    [],
  );

  // Render empty state
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

  // Render loading state
  const renderLoading = () => (
    <View
      style={styles.loadingContainer}
      testID={MusdQuickConvertViewTestIds.LOADING}
    >
      <ActivityIndicator size="large" color={colors.primary.default} />
    </View>
  );

  // If feature flags are not enabled, don't render
  if (!isMusdFlowEnabled || !isQuickConvertEnabled) {
    return null;
  }

  // TODO: Add actual loading state when we have a way to detect initial load (if necessary).
  const isLoading = false;

  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['bottom']}
        testID={MusdQuickConvertViewTestIds.CONTAINER}
      >
        {renderLoading()}
      </SafeAreaView>
    );
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
          <Text variant={TextVariant.HeadingLG}>{strings('earn.musd_conversion.convert_and_get_boost', { apy: MUSD_CONVERSION_APY })}</Text>
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>{strings('earn.musd_conversion.convert_and_hold_your_stablecoins_as_musd_and_receive_boost_on_your_money', { apy: MUSD_CONVERSION_APY })}</Text>
        </View>
        <View>
          <Text variant={TextVariant.BodyMDMedium} style={styles.balanceCardHeader}>{strings('earn.musd_conversion.your_musd')}</Text>
          <MusdBalanceCard chainId={CHAIN_IDS.MAINNET} style={styles.balanceCardContainer} />
        </View>
      </View>

      {/* Token list */}
      <FlatList
        style={styles.listContainer}
        data={tokensWithBalance}
        renderItem={renderTokenItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        testID={MusdQuickConvertViewTestIds.TOKEN_LIST}
        ListHeaderComponent={
          // TODO: Replace with i18n string.
          // TODO: Refactor to support creating groups of tokens (e.g. stablecoins and crypto)
          <SectionHeader title="Your stablecoins" />
        }
      />
    </SafeAreaView>
  );
};

export default MusdQuickConvertView;
