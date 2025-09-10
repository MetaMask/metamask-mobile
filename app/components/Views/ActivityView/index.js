/* eslint-disable react/prop-types */
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
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { useSelector } from 'react-redux';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../locales/i18n';
import ButtonBase from '../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import { IconName } from '../../../component-library/components/Icons/Icon';
import TextComponent, {
  getFontFamily,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useMetrics } from '../../../components/hooks/useMetrics';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { isNonEvmAddress } from '../../../core/Multichain/utils';
import { selectAccountsByChainId } from '../../../selectors/accountTrackerController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import {
  selectChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
} from '../../../selectors/networkController';
import { selectNetworkName } from '../../../selectors/networkInfos';
import {
  isRemoveGlobalNetworkSelectorEnabled,
  getNetworkImageSource,
} from '../../../util/networks';
import { useTheme } from '../../../util/theme';
import TabBar from '../../Base/TabBar';
import { getTransactionsNavbarOptions } from '../../UI/Navbar';
import { selectPerpsEnabledFlag } from '../../UI/Perps';
import PerpsTransactionsView from '../../UI/Perps/Views/PerpsTransactionsView';
import { PerpsConnectionProvider } from '../../UI/Perps/providers/PerpsConnectionProvider';
import RampOrdersList from '../../UI/Ramp/Aggregator/Views/OrdersList';
import { useCurrentNetworkInfo } from '../../hooks/useCurrentNetworkInfo';
import { useStyles } from '../../hooks/useStyles';
import ErrorBoundary from '../ErrorBoundary';
import MultichainTransactionsView from '../MultichainTransactionsView';
import TransactionsView from '../TransactionsView';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import {
  useNetworksByNamespace,
  NetworkType,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';

const createStyles = (params) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    wrapper: {
      flex: 1,
    },
    controlButtonOuterWrapper: {
      flexDirection: 'row',
      width: '100%',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 8,
    },
    controlButton: {
      backgroundColor: colors.background.default,
      borderColor: !isRemoveGlobalNetworkSelectorEnabled()
        ? colors.border.default
        : undefined,
      borderStyle: 'solid',
      borderWidth: isRemoveGlobalNetworkSelectorEnabled() ? 1 : 0,
      borderRadius: isRemoveGlobalNetworkSelectorEnabled() ? 8 : 0,
      maxWidth: isRemoveGlobalNetworkSelectorEnabled() ? '80%' : '60%',
      paddingHorizontal: isRemoveGlobalNetworkSelectorEnabled() ? 12 : 0,
    },
    controlButtonDisabled: {
      backgroundColor: colors.background.default,
      borderColor: !isRemoveGlobalNetworkSelectorEnabled()
        ? colors.border.default
        : undefined,
      borderStyle: 'solid',
      marginRight: 4,
      borderWidth: isRemoveGlobalNetworkSelectorEnabled() ? 1 : 0,
      borderRadius: isRemoveGlobalNetworkSelectorEnabled() ? 8 : 0,
      maxWidth: isRemoveGlobalNetworkSelectorEnabled() ? '80%' : '60%',
      paddingHorizontal: isRemoveGlobalNetworkSelectorEnabled() ? 12 : 0,
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

const ActivityView = ({ route }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

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
  const params = route.params;
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
      navigation.navigate('RootModalFlow', {
        screen: 'NetworkManager',
      });
    } else {
      navigation.navigate('RootModalFlow', { screen: 'TokenFilter' });
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

  const renderTabBar = () => <TabBar />;

  // Calculate if Perps tab is currently active
  // Perps is the last tab, so its index depends on what other tabs are shown
  const perpsTabIndex = 2;
  const isPerpsTabActive = isPerpsEnabled && activeTabIndex === perpsTabIndex;
  const isOrdersTabActive = activeTabIndex === 1;

  useFocusEffect(
    useCallback(() => {
      if (!params) return;
      if (params.redirectToOrders) {
        const orderTabNumber = 1;
        navigation.setParams({ redirectToOrders: false });
        tabViewRef.current?.goToPage(orderTabNumber);
      } else if (isPerpsEnabled && params.redirectToPerpsTransactions) {
        const perpsTabNumber = isPerpsEnabled ? 2 : 1;
        navigation.setParams({ redirectToPerpsTransactions: false });
        tabViewRef.current?.goToPage(perpsTabNumber);
      }
    }, [navigation, params, isPerpsEnabled]),
  );

  // TODO: Placeholder variable for now until we update the network enablement controller
  const firstEnabledChainId = enabledNetworks[0]?.chainId || '';
  const networkImageSource = getNetworkImageSource({
    chainId: firstEnabledChainId,
  });

  return (
    <ErrorBoundary navigation={navigation} view="ActivityView">
      <View style={[styles.header, { marginTop: insets.top }]}>
        <Text style={styles.title} variant={TextVariant.HeadingSM}>
          {strings('transactions_view.title')}
        </Text>
      </View>
      <View style={styles.wrapper}>
        {!(isPerpsTabActive || isOrdersTabActive) && (
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
                      {isAllNetworks && isAllPopularEVMNetworks && isEvmSelected
                        ? strings('wallet.popular_networks')
                        : networkName ?? strings('wallet.current_network')}
                    </TextComponent>
                  )}
                </>
              }
              isDisabled={isDisabled}
              onPress={isEvmSelected ? showFilterControls : () => null}
              endIconName={isEvmSelected ? IconName.ArrowDown : undefined}
              style={
                isDisabled ? styles.controlButtonDisabled : styles.controlButton
              }
              disabled={isDisabled}
            />
          </View>
        )}
        <ScrollableTabView
          ref={tabViewRef}
          renderTabBar={renderTabBar}
          onChangeTab={({ i }) => setActiveTabIndex(i)}
        >
          {selectedAddress && isNonEvmAddress(selectedAddress) ? (
            <MultichainTransactionsView
              tabLabel={strings('transactions_view.title')}
              chainId={currentChainId}
            />
          ) : (
            <TransactionsView tabLabel={strings('transactions_view.title')} />
          )}

          <RampOrdersList
            tabLabel={strings('fiat_on_ramp_aggregator.orders')}
          />

          {isPerpsEnabled && (
            <PerpsConnectionProvider
              tabLabel={strings('perps.transactions.title')}
            >
              <PerpsTransactionsView />
            </PerpsConnectionProvider>
          )}
        </ScrollableTabView>
      </View>
    </ErrorBoundary>
  );
};

export default ActivityView;
