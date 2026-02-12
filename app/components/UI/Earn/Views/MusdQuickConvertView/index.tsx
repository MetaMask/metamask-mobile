import React, { useCallback, useMemo } from 'react';
import { View, SectionList, Linking } from 'react-native';
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
import { selectMusdQuickConvertEnabledFlag } from '../../selectors/featureFlags';
import {
  createTokenChainKey,
  selectHasInFlightMusdConversion,
  selectMusdConversionStatuses,
} from '../../selectors/musdConversionStatus';
import ConvertTokenRow from '../../components/Musd/ConvertTokenRow';
import styleSheet from './MusdQuickConvertView.styles';
import { MusdQuickConvertViewTestIds } from './MusdQuickConvertView.types';
import Tag from '../../../../../component-library/components/Tags/Tag';
import { TagProps } from '../../../../../component-library/components/Tags/Tag/Tag.types';
import { MUSD_CONVERSION_APY } from '../../constants/musd';
import AppConstants from '../../../../../core/AppConstants';
import MusdBalanceCard from './components/MusdBalanceCard';

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
  const isQuickConvertEnabled = useSelector(selectMusdQuickConvertEnabledFlag);

  // Get convertible tokens
  const { tokens: conversionTokens } = useMusdConversionTokens();

  const hasInFlightMusdConversion = useSelector(
    selectHasInFlightMusdConversion,
  );

  const conversionStatusesByTokenChainKey = useSelector(
    selectMusdConversionStatuses,
  );

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
    ({ item }: { item: AssetType }) => {
      const tokenAddress = item.address;
      const tokenChainId = item.chainId;

      const tokenChainKey =
        tokenAddress && tokenChainId
          ? createTokenChainKey(tokenAddress, tokenChainId)
          : undefined;

      const statusInfo = tokenChainKey
        ? conversionStatusesByTokenChainKey[tokenChainKey]
        : undefined;

      return (
        <ConvertTokenRow
          token={item}
          onMaxPress={handleMaxPress}
          onEditPress={handleEditPress}
          isActionsDisabled={hasInFlightMusdConversion}
          isConversionPending={Boolean(statusInfo?.isPending)}
          errorMessage={
            statusInfo?.isFailed
              ? strings(
                  'earn.musd_conversion.quick_convert.inline_failed_message',
                )
              : undefined
          }
        />
      );
    },
    [
      conversionStatusesByTokenChainKey,
      handleEditPress,
      handleMaxPress,
      hasInFlightMusdConversion,
    ],
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
  if (!isQuickConvertEnabled) {
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
          <MusdBalanceCard />
        </View>
      </View>

      {/* Token list */}
      <SectionList<AssetType, TokenSection>
        style={styles.listContainer}
        sections={tokenSections}
        renderItem={renderTokenItem}
        keyExtractor={(item) => `${item.address}-${item.chainId}`}
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
