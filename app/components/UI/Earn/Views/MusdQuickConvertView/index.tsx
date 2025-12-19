import React, { useCallback, useMemo, useState } from 'react';
import { View, FlatList, ActivityIndicator } from 'react-native';
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
import { useMusdMaxConversion } from '../../hooks/useMusdMaxConversion';
import {
  selectMusdConversionStatuses,
  createTokenChainKey,
  deriveConversionUIStatus,
} from '../../selectors/musdConversionStatus';
import {
  selectIsMusdConversionFlowEnabledFlag,
  selectMusdQuickConvertEnabledFlag,
} from '../../selectors/featureFlags';
import ConvertTokenRow from '../../components/Musd/ConvertTokenRow';
import MusdQuickConvertLearnMoreCta from '../../components/Musd/MusdQuickConvertLearnMoreCta';
import styleSheet from './MusdQuickConvertView.styles';
import { MusdQuickConvertViewTestIds } from './MusdQuickConvertView.types';
import Tag from '../../../../../component-library/components/Tags/Tag';
import { TagProps } from '../../../../../component-library/components/Tags/Tag/Tag.types';

// TODO: Breakout
interface TokenListDividerProps {
  title: string;
  tag: TagProps;
}

const SectionHeader = ({ title, tag }: TokenListDividerProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.listHeaderContainer}>
      <Text variant={TextVariant.BodyMDMedium}>{title}</Text>
      <Tag {...tag} />
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
const MusdQuickConvertView = () => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;
  const navigation = useNavigation();
  const { initiateConversion } = useMusdConversion();
  const { createMaxConversion, isLoading: isMaxConversionLoading } =
    useMusdMaxConversion();
  const { getMusdOutputChainId } = useMusdConversionTokens();

  // Track which token is currently loading for max conversion
  const [loadingTokenKey, setLoadingTokenKey] = useState<string | null>(null);

  // Feature flags
  const isMusdFlowEnabled = useSelector(selectIsMusdConversionFlowEnabledFlag);
  const isQuickConvertEnabled = useSelector(selectMusdQuickConvertEnabledFlag);

  // Get convertible tokens
  const { tokens: conversionTokens } = useMusdConversionTokens();

  // Get conversion statuses from TransactionController
  const conversionStatuses = useSelector(selectMusdConversionStatuses);

  // TODO: Circle back to ensure the header looks like designs.
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
      const tokenKey = createTokenChainKey(token.address, token.chainId ?? '');
      setLoadingTokenKey(tokenKey);
      try {
        await createMaxConversion(token);
      } finally {
        // Clear loading state after navigation (transaction created successfully)
        // or if an error occurred
        setLoadingTokenKey(null);
      }
    },
    [createMaxConversion],
  );

  // navigate to existing confirmation screen
  const handleEditPress = useCallback(
    async (token: AssetType) => {
      const outputChainId = getMusdOutputChainId(token.chainId);

      await initiateConversion({
        outputChainId,
        preferredPaymentToken: {
          address: token.address as Hex,
          chainId: token.chainId as Hex,
        },
      });
    },
    [initiateConversion, getMusdOutputChainId],
  );

  // Get status for a token
  const getTokenStatus = useCallback(
    (token: AssetType) => {
      const key = createTokenChainKey(token.address, token.chainId ?? '');

      // If this token is currently being loaded (transaction being created),
      // show pending state to give immediate feedback
      if (isMaxConversionLoading && loadingTokenKey === key) {
        return 'pending';
      }

      const statusInfo = conversionStatuses[key] ?? null;
      return deriveConversionUIStatus(statusInfo);
    },
    [conversionStatuses, isMaxConversionLoading, loadingTokenKey],
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
        status={getTokenStatus(item)}
      />
    ),
    [handleMaxPress, handleEditPress, getTokenStatus],
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
      <Text variant={TextVariant.HeadingLG}>Convert</Text>
      {/* Header section */}
      <View
        style={styles.headerContainer}
        testID={MusdQuickConvertViewTestIds.HEADER}
      >
        <MusdQuickConvertLearnMoreCta />
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
          <SectionHeader title="Stablecoins" tag={{ label: 'No fees' }} />
        }
      />
    </SafeAreaView>
  );
};

export default MusdQuickConvertView;
