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
import {
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
} from '../../constants/musd';
import ConvertTokenRow from '../../components/Musd/ConvertTokenRow';
import styleSheet from './MusdQuickConvertView.styles';
import { MusdQuickConvertViewTestIds } from './MusdQuickConvertView.types';

/**
 * Determines the output chain ID for mUSD conversion.
 * Uses same-chain if mUSD is deployed there, otherwise defaults to Ethereum mainnet.
 */
// TODO: Breakout into util since this is also defined in the useMusdMaxConversion hook.
const getOutputChainId = (paymentTokenChainId: Hex): Hex => {
  const mUsdAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[paymentTokenChainId];
  if (mUsdAddress) {
    return paymentTokenChainId;
  }
  return MUSD_CONVERSION_DEFAULT_CHAIN_ID as Hex;
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

  // Handle Max button press - navigate to max conversion confirmation
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

  // Handle Edit button press - navigate to existing confirmation screen
  const handleEditPress = useCallback(
    async (token: AssetType) => {
      const outputChainId = getOutputChainId(token.chainId as Hex);

      await initiateConversion({
        outputChainId,
        preferredPaymentToken: {
          address: token.address as Hex,
          chainId: token.chainId as Hex,
        },
      });
    },
    [initiateConversion],
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

  // Filter tokens to only show those with balance > 0
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
      {/* Header section */}
      <View
        style={styles.headerContainer}
        testID={MusdQuickConvertViewTestIds.HEADER}
      >
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('earn.musd_conversion.quick_convert_description')}
        </Text>
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
      />
    </SafeAreaView>
  );
};

export default MusdQuickConvertView;
