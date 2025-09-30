import { typography } from '@metamask/design-tokens';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../locales/i18n';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import { Box } from '@metamask/design-system-react-native';
import ButtonBase from '../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import { IconName } from '../../../component-library/components/Icons/Icon';
import TextComponent, {
  getFontFamily,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useMetrics } from '../../../components/hooks/useMetrics';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { isNonEvmAddress } from '../../../core/Multichain/utils';
import { selectAccountsByChainId } from '../../../selectors/accountTrackerController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import {
  selectChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
} from '../../../selectors/networkController';
import { selectNetworkName } from '../../../selectors/networkInfos';
import { useParams } from '../../../util/navigation/navUtils';
import {
  getNetworkImageSource,
  isRemoveGlobalNetworkSelectorEnabled,
} from '../../../util/networks';
import { useTheme } from '../../../util/theme';
import { TabsList } from '../../../component-library/components-temp/Tabs';
import { getTransactionsNavbarOptions } from '../../UI/Navbar';
import { createNetworkManagerNavDetails } from '../../UI/NetworkManager';
import { selectPerpsEnabledFlag } from '../../UI/Perps';
import PerpsTransactionsView from '../../UI/Perps/Views/PerpsTransactionsView';
import { PerpsConnectionProvider } from '../../UI/Perps/providers/PerpsConnectionProvider';
import RampOrdersList from '../../UI/Ramp/Aggregator/Views/OrdersList';
import { createTokenBottomSheetFilterNavDetails } from '../../UI/Tokens/TokensBottomSheet';
import { useCurrentNetworkInfo } from '../../hooks/useCurrentNetworkInfo';
import {
  NetworkType,
  useNetworksByNamespace,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useStyles } from '../../hooks/useStyles';
import ErrorBoundary from '../ErrorBoundary';
import MultichainTransactionsView from '../MultichainTransactionsView';
import TransactionsView from '../TransactionsView';
import UnifiedTransactionsView from '../UnifiedTransactionsView/UnifiedTransactionsView';

const createStyles = (params) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    wrapper: {
      flex: 1,
      paddingHorizontal: 16,
    },
    tabWrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    controlButtonOuterWrapper: {
      flexDirection: 'row',
      width: '100%',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: 8,
    },
    controlButton: {
      backgroundColor: colors.background.default,
      borderColor: colors.border.muted,
      borderWidth: 1,
      borderRadius: 8,
      maxWidth: '80%',
      paddingHorizontal: 12,
    },
    controlButtonDisabled: {
      backgroundColor: colors.background.default,
      borderColor: colors.border.muted,
      marginRight: 4,
      borderWidth: 1,
      borderRadius: 8,
      maxWidth: '80%',
      paddingHorizontal: 12,
      opacity: 0.5,
    },
    networkManagerWrapper: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    header: {
      backgroundColor: colors.background.default,
      flexDirection: 'row',
      paddingHorizontal: 16,
    },
    title: {
      marginTop: 20,
      fontSize: 20,
      color: colors.text.default,
      ...typography.sHeadingMD,
      fontFamily: getFontFamily(TextVariant.HeadingMD),
    },
    titleText: {
      color: colors.text.default,
    },
  });
};

const ActivityView = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tw = useTailwind();

  const { styles } = useStyles(createStyles, {
    style: { marginTop: insets.top },
  });

  const { trackEvent, createEventBuilder } = useMetrics();
  const navigation = useNavigation();
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  const currentChainId = useSelector(selectChainId);
  const isAllNetworks = useSelector(selectIsAllNetworks);
  const isAllPopularEVMNetworks = useSelector(selectIsPopularNetwork);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const networkName = useSelector(selectNetworkName);
  const accountsByChainId = useSelector(selectAccountsByChainId);

  const { enabledNetworks, getNetworkInfo, isDisabled } =
    useCurrentNetworkInfo();
  const { areAllNetworksSelected } = useNetworksByNamespace({
    networkType: NetworkType.Popular,
  });

  const currentNetworkName = getNetworkInfo(0)?.networkName;

  const tabViewRef = useRef();
  const params = useParams();
  const perpsEnabledFlag = useSelector(selectPerpsEnabledFlag);
  const isPerpsEnabled = useMemo(
    () => perpsEnabledFlag && isEvmSelected,
    [perpsEnabledFlag, isEvmSelected],
  );
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const openAccountSelector = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.ACCOUNT_SELECTOR,
    });
    // Track Event: "Opened Acount Switcher"
    trackEvent(
      createEventBuilder(MetaMetricsEvents.BROWSER_OPEN_ACCOUNT_SWITCH)
        .addProperties({
          number_of_accounts: Object.keys(
            accountsByChainId[selectedAddress] ?? {},
          ).length,
        })
        .build(),
    );
  }, [
    navigation,
    accountsByChainId,
    selectedAddress,
    trackEvent,
    createEventBuilder,
  ]);

  const showFilterControls = () => {
    if (isRemoveGlobalNetworkSelectorEnabled()) {
      navigation.navigate(...createNetworkManagerNavDetails({}));
    } else {
      navigation.navigate(...createTokenBottomSheetFilterNavDetails({}));
    }
  };

  useEffect(
    () => {
      const title = 'activity_view.title';
      navigation.setOptions(
        getTransactionsNavbarOptions(
          title,
          colors,
          navigation,
          selectedAddress,
          openAccountSelector,
        ),
      );
    },
    /* eslint-disable-next-line */
    [navigation, colors, selectedAddress, openAccountSelector],
  );

  // Calculate if Perps tab is currently active
  // Perps is the last tab, so its index depends on what other tabs are shown
  const perpsTabIndex = 2;
  const isPerpsTabActive = isPerpsEnabled && activeTabIndex === perpsTabIndex;
  const isOrdersTabActive = activeTabIndex === 1;

  useFocusEffect(
    useCallback(() => {
      if (params.redirectToOrders) {
        const orderTabNumber = 1;
        navigation.setParams({ redirectToOrders: false });
        tabViewRef.current?.goToTabIndex(orderTabNumber);
      } else if (isPerpsEnabled && params.redirectToPerpsTransactions) {
        const perpsTabNumber = isPerpsEnabled ? 2 : 1;
        navigation.setParams({ redirectToPerpsTransactions: false });
        tabViewRef.current?.goToTabIndex(perpsTabNumber);
      }
    }, [
      navigation,
      params.redirectToOrders,
      isPerpsEnabled,
      params.redirectToPerpsTransactions,
    ]),
  );

  // TODO: Placeholder variable for now until we update the network enablement controller
  const firstEnabledChainId = enabledNetworks[0]?.chainId || '';
  const networkImageSource = getNetworkImageSource({
    chainId: firstEnabledChainId,
  });

  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
  const isGlobalNetworkSelectorRemoved =
    process.env.MM_REMOVE_GLOBAL_NETWORK_SELECTOR === 'true';
  const showUnifiedActivityList =
    isGlobalNetworkSelectorRemoved && isMultichainAccountsState2Enabled;

  return (
    <ErrorBoundary navigation={navigation} view="ActivityView">
      <Box
        twClassName="flex-1 px-4 bg-default gap-4"
        style={{ marginTop: insets.top }}
      >
        <Box twClassName="mb-4">
          <TextComponent
            variant={TextVariant.HeadingLG}
            twClassName="text-default"
          >
            {strings('activity_view.title')}
          </TextComponent>
        </Box>
        <TabsList
          ref={tabViewRef}
          onChangeTab={({ i }) => setActiveTabIndex(i)}
        >
          <View
            key="transactions"
            tabLabel={strings('transactions_view.title')}
            style={styles.tabWrapper}
          >
            <View style={styles.controlButtonOuterWrapper}>
              <ButtonBase
                testID={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
                label={
                  <>
                    {isRemoveGlobalNetworkSelectorEnabled() ? (
                      <View style={styles.networkManagerWrapper}>
                        {!areAllNetworksSelected && (
                          <Avatar
                            variant={AvatarVariant.Network}
                            size={AvatarSize.Xs}
                            name={networkName}
                            imageSource={networkImageSource}
                          />
                        )}
                        <TextComponent
                          variant={TextVariant.BodyMDMedium}
                          style={styles.controlButtonText}
                          numberOfLines={1}
                        >
                          {enabledNetworks.length > 1
                            ? strings('wallet.all_networks')
                            : currentNetworkName ??
                              strings('wallet.current_network')}
                        </TextComponent>
                      </View>
                    ) : (
                      <TextComponent
                        variant={TextVariant.BodyMDMedium}
                        style={styles.titleText}
                        numberOfLines={1}
                      >
                        {isAllNetworks &&
                        isAllPopularEVMNetworks &&
                        isEvmSelected
                          ? strings('wallet.popular_networks')
                          : networkName ?? strings('wallet.current_network')}
                      </TextComponent>
                    )}
                  </>
                }
                isDisabled={isDisabled && !isMultichainAccountsState2Enabled}
                onPress={
                  isEvmSelected || isMultichainAccountsState2Enabled
                    ? showFilterControls
                    : () => null
                }
                endIconName={
                  isEvmSelected || isMultichainAccountsState2Enabled
                    ? IconName.ArrowDown
                    : undefined
                }
                style={
                  isDisabled && !isMultichainAccountsState2Enabled
                    ? styles.controlButtonDisabled
                    : styles.controlButton
                }
                disabled={isDisabled && !isMultichainAccountsState2Enabled}
              />
            </View>
            {showUnifiedActivityList ? (
              <UnifiedTransactionsView chainId={currentChainId} />
            ) : selectedAddress && isNonEvmAddress(selectedAddress) ? (
              <MultichainTransactionsView chainId={currentChainId} />
            ) : (
              <TransactionsView />
            )}
          </View>
          <View
            key="orders"
            tabLabel={strings('fiat_on_ramp_aggregator.orders')}
            style={styles.tabWrapper}
          >
            <RampOrdersList />
          </View>

          {isPerpsEnabled && (
            <View
              key="perps"
              tabLabel={strings('perps.transactions.title')}
              style={styles.tabWrapper}
            >
              <PerpsConnectionProvider isVisible={isPerpsTabActive}>
                <PerpsTransactionsView />
              </PerpsConnectionProvider>
            </View>
          )}
        </TabsList>
      </Box>
    </ErrorBoundary>
  );
};

export default ActivityView;
