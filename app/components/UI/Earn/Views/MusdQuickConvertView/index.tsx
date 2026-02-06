import React, { useCallback, useMemo } from 'react';
import {
  View,
  SectionList,
  StyleSheet,
  Image,
  ViewStyle,
  Linking,
} from 'react-native';
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
import {
  MUSD_CONVERSION_APY,
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS,
} from '../../constants/musd';
import { Theme } from '../../../../../util/theme/models';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { getNetworkImageSource } from '../../../../../util/networks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import AppConstants from '../../../../../core/AppConstants';
import { selectAsset } from '../../../../../selectors/assets/assets-list';
import { RootState } from '../../../../../reducers';
import { toFormattedAddress } from '../../../../../util/address';

const musdBadgeStyles = (params: { theme: Theme; vars: { size: number } }) => {
  const {
    vars: { size },
  } = params;

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

const musdBalanceStyles = () =>
  StyleSheet.create({
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
    },
  });

interface MusdBalanceCardProps {
  chainId: Hex;
  style?: ViewStyle;
}

const MusdBalanceCard = ({ chainId, style }: MusdBalanceCardProps) => {
  const { styles } = useStyles(musdBalanceStyles, {});

  const musdBalance = useSelector((state: RootState) =>
    selectAsset(state, {
      address: toFormattedAddress(MUSD_TOKEN_ADDRESS),
      chainId,
      isStaked: false,
    }),
  );

  const percentChange = MUSD_CONVERSION_APY;
  const percentChangeFormatted =
    percentChange > 0
      ? `+${percentChange.toFixed(2)}%`
      : `-${percentChange.toFixed(2)}%`;
  const percentChangeColor =
    percentChange > 0 ? TextColor.Success : TextColor.Error;

  return (
    <View style={[styles.container, style]}>
      {/* Left side: Token icon and info */}
      <View style={styles.left}>
        <MusdBadge chainId={chainId} size={32} />
        <View>
          <Text variant={TextVariant.BodyMDMedium}>
            {musdBalance?.balanceFiat ?? '--.--'}
          </Text>
          <Text
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
          >
            {MUSD_TOKEN.symbol}
          </Text>
        </View>
        <View></View>
      </View>
      {/* Right side: No boost and boost amount */}
      <View style={styles.right}>
        {/* TODO: Replace with actual boost value */}
        <Text variant={TextVariant.BodyMDMedium}>
          {strings('earn.musd_conversion.no_boost')}
        </Text>
        <Text variant={TextVariant.BodySMMedium} color={percentChangeColor}>
          {percentChangeFormatted}
        </Text>
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
            chainId={CHAIN_IDS.MAINNET}
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
