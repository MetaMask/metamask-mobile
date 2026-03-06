import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { WalletViewSelectorsIDs } from '../Wallet/WalletView.testIds';
import { ActivitiesViewSelectorsIDs } from './ActivitiesView.testIds';
import { strings } from '../../../../locales/i18n';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import { Box } from '@metamask/design-system-react-native';
import ButtonBase from '../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import HeaderRoot from '../../../component-library/components-temp/HeaderRoot';
import { IconName } from '../../../component-library/components/Icons/Icon';
import TextComponent, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectChainId } from '../../../selectors/networkController';
import { selectNetworkName } from '../../../selectors/networkInfos';
import { useParams } from '../../../util/navigation/navUtils';
import { getNetworkImageSource } from '../../../util/networks';
import { useTheme } from '../../../util/theme';
import { TabsList } from '../../../component-library/components-temp/Tabs';
import { createNetworkManagerNavDetails } from '../../UI/NetworkManager';
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
  useNetworksByNamespace,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useStyles } from '../../hooks/useStyles';
import ErrorBoundary from '../ErrorBoundary';
import UnifiedTransactionsView from '../UnifiedTransactionsView/UnifiedTransactionsView';

const createStyles = (params) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
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
      paddingHorizontal: 16,
    },
    controlButton: {
      backgroundColor: colors.background.default,
      borderColor: colors.border.muted,
      borderWidth: 1,
      borderRadius: 8,
      maxWidth: '80%',
      paddingHorizontal: 12,
    },
    networkManagerWrapper: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    titleText: {
      color: colors.text.default,
    },
  });
};

const ActivityView = () => {
  const { colors } = useTheme();
  const tw = useTailwind();

  const { styles } = useStyles(createStyles);

  const navigation = useNavigation();

  const currentChainId = useSelector(selectChainId);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const networkName = useSelector(selectNetworkName);

  const { enabledNetworks, getNetworkInfo } = useCurrentNetworkInfo();
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
  const predictEnabledFlag = useSelector(selectPredictEnabledFlag);
  const isPredictEnabled = useMemo(
    () => predictEnabledFlag,
    [predictEnabledFlag],
  );

  const showFilterControls = () => {
    navigation.navigate(...createNetworkManagerNavDetails({}));
  };

  const handleBackPress = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const showBackButton = params.showBackButton || false;

  // Calculate dynamic tab indices based on which tabs are enabled
  // Tab order: Transactions (0), Orders (1), Perps (conditional), Predict (conditional)
  // Perps comes after Transactions (0) and Orders (1)
  const perpsTabIndex = useMemo(() => 2, []);

  // Predict comes after Transactions (0), Orders (1), and optionally Perps
  const predictTabIndex = useMemo(
    () => (isPerpsEnabled ? 3 : 2),
    [isPerpsEnabled],
  );

  const isPerpsTabActive = isPerpsEnabled && activeTabIndex === perpsTabIndex;
  const isPredictTabActive =
    isPredictEnabled && activeTabIndex === predictTabIndex;

  useFocusEffect(
    useCallback(() => {
      if (params.redirectToOrders) {
        const orderTabNumber = 1;
        navigation.setParams({ redirectToOrders: false });
        tabViewRef.current?.goToTabIndex(orderTabNumber);
      } else if (isPerpsEnabled && params.redirectToPerpsTransactions) {
        navigation.setParams({ redirectToPerpsTransactions: false });
        tabViewRef.current?.goToTabIndex(perpsTabIndex);
      }
    }, [
      navigation,
      params.redirectToOrders,
      isPerpsEnabled,
      params.redirectToPerpsTransactions,
      perpsTabIndex,
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
        edges={{ bottom: 'additive' }}
        style={[
          tw.style('flex-1'),
          { backgroundColor: colors.background.default },
        ]}
        testID={ActivitiesViewSelectorsIDs.SAFE_AREA_VIEW}
      >
        {showBackButton ? (
          <HeaderCompactStandard
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
            ref={tabViewRef}
            onChangeTab={({ i }) => setActiveTabIndex(i)}
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
                          numberOfLines={1}
                        >
                          {enabledNetworks.length > 1
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
                {isPerpsTabActive ? (
                  <PerpsConnectionProvider manageLifecycle={false}>
                    <PerpsStreamProvider>
                      <PerpsTransactionsView />
                    </PerpsStreamProvider>
                  </PerpsConnectionProvider>
                ) : null}
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

export default ActivityView;
