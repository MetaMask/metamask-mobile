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
import MusdMaxConvertSheet from '../../components/Musd/MusdMaxConvertSheet';
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

  // Feature flags
  const isMusdFlowEnabled = useSelector(selectIsMusdConversionFlowEnabledFlag);
  const isQuickConvertEnabled = useSelector(selectMusdQuickConvertEnabledFlag);

  // Get convertible tokens
  const { tokens: conversionTokens } = useMusdConversionTokens();

  // Get conversion statuses from TransactionController
  const conversionStatuses = useSelector(selectMusdConversionStatuses);

  // State for the Max convert bottom sheet
  const [selectedToken, setSelectedToken] = useState<AssetType | null>(null);
  const [isMaxSheetVisible, setIsMaxSheetVisible] = useState(false);

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

  // Handle Max button press - open bottom sheet
  const handleMaxPress = useCallback((token: AssetType) => {
    if (!token.rawBalance) {
      // Can't proceed without raw balance
      return;
    }
    setSelectedToken(token);
    setIsMaxSheetVisible(true);
  }, []);

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

  // Handle Max sheet close
  const handleMaxSheetClose = useCallback(() => {
    setIsMaxSheetVisible(false);
    setSelectedToken(null);
  }, []);

  // Get status for a token
  const getTokenStatus = useCallback(
    (token: AssetType) => {
      const key = createTokenChainKey(token.address, token.chainId ?? '');
      const statusInfo = conversionStatuses[key] ?? null;
      return deriveConversionUIStatus(statusInfo);
    },
    [conversionStatuses],
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

      {/* Max Convert Bottom Sheet */}
      {/* TODO: Test thoroughly on Android. Android has history of issues with bottom sheets. */}
      {isMaxSheetVisible && selectedToken && (
        <MusdMaxConvertSheet
          token={selectedToken}
          onClose={handleMaxSheetClose}
        />
      )}
    </SafeAreaView>
  );
};

export default MusdQuickConvertView;
