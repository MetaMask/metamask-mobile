import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../Wallet/WalletView.testIds';
import { ActivitiesViewSelectorsIDs } from './ActivitiesView.testIds';
import { strings } from '../../../../locales/i18n';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import ButtonBase from '../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import HeaderRoot from '../../../component-library/components-temp/HeaderRoot';
import { IconName } from '../../../component-library/components/Icons/Icon';
import TextComponent, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { KnownCaipNamespace } from '@metamask/utils';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectChainId } from '../../../selectors/networkController';
import { selectNetworkName } from '../../../selectors/networkInfos';
import Routes from '../../../constants/navigation/Routes';
import { useParams } from '../../../util/navigation/navUtils';
import { getNetworkImageSource } from '../../../util/networks';
import { useTheme } from '../../../util/theme';
import { TabsList } from '../../../component-library/components-temp/Tabs';
import { createNetworkManagerNavDetails } from '../../UI/NetworkManager';
import { selectMoneyEnableMoneyAccountFlag } from '../../UI/Money/selectors/featureFlags';
import { selectPerpsEnabledFlag } from '../../UI/Perps';
import { selectPredictEnabledFlag } from '../../UI/Predict/selectors/featureFlags';
import PredictTransactionsView from '../../UI/Predict/views/PredictTransactionsView/PredictTransactionsView';
import PerpsTransactionsView from '../../UI/Perps/Views/PerpsTransactionsView';
import { PerpsConnectionProvider } from '../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../UI/Perps/providers/PerpsStreamManager';
import RampOrdersList from '../../UI/Ramp/Aggregator/Views/OrdersList';
import { useCurrentNetworkInfo } from '../../hooks/useCurrentNetworkInfo';
import {
  NetworkType,
  useNetworksByCustomNamespace,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useStyles } from '../../hooks/useStyles';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import ErrorBoundary from '../ErrorBoundary';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import UnifiedTransactionsView from '../UnifiedTransactionsView/UnifiedTransactionsView';
import styleSheet from './ActivityView.styles';
import { selectIsActivityRedesignEnabled } from './selectors/featureFlags';

// Lazily loaded so the redesigned Activity screen and its dependencies are not
// evaluated when `tmcuActivityRedesignEnabled` is off, keeping the legacy path
// fully isolated.
const ActivityScreen = React.lazy(
  () =>
    // eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
    import('../ActivityScreen/ActivityScreen'),
);

const LegacyActivityView = () => {
  const { colors } = useTheme();
  const tw = useTailwind();

  const { styles } = useStyles(styleSheet, {});

  const navigation = useNavigation();

  const currentChainId = useSelector(selectChainId);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const networkName = useSelector(selectNetworkName);

  const { enabledNetworks, getNetworkInfo } = useCurrentNetworkInfo();
  const {
    areAllNetworksSelected: areAllEvmPopularNetworksEnabled,
    totalEnabledNetworksCount,
  } = useNetworksByCustomNamespace({
    networkType: NetworkType.Popular,
    namespace: KnownCaipNamespace.Eip155,
  });

  const displayAllNetworks = totalEnabledNetworksCount > 1;
  const showNetworkFilterAvatar =
    !displayAllNetworks && !areAllEvmPopularNetworksEnabled;

  const currentNetworkName = getNetworkInfo(0)?.networkName;

  const isMoneyAccountEnabled = useSelector(selectMoneyEnableMoneyAccountFlag);

  const params = useParams();
  const perpsEnabledFlag = useSelector(selectPerpsEnabledFlag);
  const isPerpsEnabled = useMemo(
    () =>
      perpsEnabledFlag && (isEvmSelected || areAllEvmPopularNetworksEnabled),
    [perpsEnabledFlag, isEvmSelected, areAllEvmPopularNetworksEnabled],
  );
  const predictEnabledFlag = useSelector(selectPredictEnabledFlag);
  const isPredictEnabled = useMemo(
    () => predictEnabledFlag,
    [predictEnabledFlag],
  );

  const showFilterControls = () => {
    navigation.navigate(...createNetworkManagerNavDetails({}));
  };

  // Prevent back button returning to confirmation screen in case that users are redirected after a successful transaction.
  const handleNavigateHome = useCallback(() => {
    navigation.navigate(Routes.HOME_TABS);
  }, [navigation]);

  const handleBackPress = useCallback(() => {
    if (isMoneyAccountEnabled) {
      handleNavigateHome();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [isMoneyAccountEnabled, navigation, handleNavigateHome]);

  useEffect(() => {
    if (!isMoneyAccountEnabled) return;

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleNavigateHome();
        return true;
      },
    );

    return () => subscription.remove();
  }, [navigation, isMoneyAccountEnabled, handleNavigateHome]);

  const showBackButton = params.showBackButton || isMoneyAccountEnabled;

  // Calculate dynamic tab indices based on which tabs are enabled
  // Tab order: Transactions (0), Orders (1), Perps (conditional), Predict (conditional)
  // Perps comes after Transactions (0) and Orders (1)
  const perpsTabIndex = useMemo(() => 2, []);

  const [initialTabIndex] = useState(() => {
    if (params.redirectToOrders) {
      return 1;
    }
    if (isPerpsEnabled && params.redirectToPerpsTransactions) {
      return perpsTabIndex;
    }
    return 0;
  });
  const [activeTabIndex, setActiveTabIndex] = useState(initialTabIndex);

  // Predict comes after Transactions (0), Orders (1), and optionally Perps
  const predictTabIndex = useMemo(
    () => (isPerpsEnabled ? 3 : 2),
    [isPerpsEnabled],
  );

  const isPerpsTabActive = isPerpsEnabled && activeTabIndex === perpsTabIndex;
  const isPredictTabActive =
    isPredictEnabled && activeTabIndex === predictTabIndex;

  const handleChangeTab = useCallback(({ i }) => {
    setActiveTabIndex(i);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const nextParams = {};
      if (params.redirectToOrders) {
        nextParams.redirectToOrders = false;
      }
      if (params.redirectToPerpsTransactions) {
        nextParams.redirectToPerpsTransactions = false;
      }
      if (Object.keys(nextParams).length > 0) {
        navigation.setParams(nextParams);
      }
    }, [
      navigation,
      params.redirectToOrders,
      params.redirectToPerpsTransactions,
    ]),
  );

  // TODO: Placeholder variable for now until we update the network enablement controller
  const firstEnabledChainId = enabledNetworks[0]?.chainId || '';
  const networkImageSource = getNetworkImageSource({
    chainId: firstEnabledChainId,
  });

  return (
    <ErrorBoundary navigation={navigation} view="ActivityView">
      <SafeAreaView
        edges={['left', 'right', 'bottom']}
        style={[
          tw.style('flex-1'),
          { backgroundColor: colors.background.default },
        ]}
        testID={ActivitiesViewSelectorsIDs.SAFE_AREA_VIEW}
      >
        {showBackButton ? (
          <HeaderStandard
            title={strings('activity_view.title')}
            onBack={handleBackPress}
            includesTopInset
            backButtonProps={{ testID: 'activity-view-back-button' }}
            testID={ActivitiesViewSelectorsIDs.HEADER_COMPACT_STANDARD}
          />
        ) : (
          <HeaderRoot
            title={strings('activity_view.title')}
            includesTopInset
            testID={ActivitiesViewSelectorsIDs.HEADER_ROOT}
          />
        )}

        <Box twClassName="flex-1 gap-4">
          <TabsList
            initialActiveIndex={initialTabIndex}
            onChangeTab={handleChangeTab}
            tabsListContentTwClassName="px-0 pb-3"
            testID={ActivitiesViewSelectorsIDs.TABS_CONTAINER}
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
                      <View style={styles.networkManagerWrapper}>
                        {showNetworkFilterAvatar && (
                          <Avatar
                            variant={AvatarVariant.Network}
                            size={AvatarSize.Xs}
                            name={networkName}
                            imageSource={networkImageSource}
                          />
                        )}
                        <TextComponent
                          variant={TextVariant.BodyMDMedium}
                          numberOfLines={1}
                        >
                          {displayAllNetworks
                            ? strings('wallet.popular_networks')
                            : (currentNetworkName ??
                              strings('wallet.current_network'))}
                        </TextComponent>
                      </View>
                    </>
                  }
                  isDisabled={false}
                  onPress={showFilterControls}
                  endIconName={IconName.ArrowDown}
                  style={styles.controlButton}
                  disabled={false}
                />
              </View>
              <UnifiedTransactionsView chainId={currentChainId} />
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
                <PerpsConnectionProvider>
                  <PerpsStreamProvider>
                    {isPerpsTabActive ? <PerpsTransactionsView /> : null}
                  </PerpsStreamProvider>
                </PerpsConnectionProvider>
              </View>
            )}

            {isPredictEnabled && (
              <View
                key="predict"
                tabLabel={strings('predict.transactions.title')}
                style={styles.tabWrapper}
              >
                <PredictTransactionsView isVisible={isPredictTabActive} />
              </View>
            )}
          </TabsList>
        </Box>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const ActivityView = () => {
  const isActivityRedesignEnabled = useSelector(
    selectIsActivityRedesignEnabled,
  );

  return isActivityRedesignEnabled ? (
    <React.Suspense fallback={null}>
      <ActivityScreen />
    </React.Suspense>
  ) : (
    <LegacyActivityView />
  );
};

export default ActivityView;
