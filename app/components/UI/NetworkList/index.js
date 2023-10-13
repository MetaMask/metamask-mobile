import React, { PureComponent } from 'react';
import Engine from '../../../core/Engine';
import PropTypes from 'prop-types';
import URLPARSE from 'url-parse';
import Icon from 'react-native-vector-icons/FontAwesome';
import {
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Platform,
} from 'react-native';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import Networks, {
  getAllNetworks,
  getDecimalChainId,
  getNetworkImageSource,
  isSafeChainId,
} from '../../../util/networks';
import { connect } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';

import StyledButton from '../StyledButton';
import { ThemeContext, mockTheme } from '../../../util/theme';
import {
  MAINNET,
  RPC,
  PRIVATENETWORK,
  NETWORKS_CHAIN_ID,
  LINEA_TESTNET_TICKER,
  LINEA_TESTNET_NICKNAME,
} from '../../../constants/network';
import { ETH } from '../../../util/custom-gas';
import sanitizeUrl from '../../../util/sanitizeUrl';
import {
  NETWORK_LIST_CLOSE_ICON,
  NETWORK_LIST_MODAL_CONTAINER_ID,
  NETWORK_SCROLL_ID,
} from '../../../../wdio/screen-objects/testIDs/Components/NetworkListModal.TestIds';
import ImageIcon from '../ImageIcon';
import {
  AvatarVariants,
  AvatarSize,
} from '../../../component-library/components/Avatars/Avatar';
import { ADD_NETWORK_BUTTON } from '../../../../wdio/screen-objects/testIDs/Screens/NetworksScreen.testids';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { selectProviderConfig } from '../../../selectors/networkController';
import AvatarNetwork from '../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import {
  LINEA_TESTNET_BLOCK_EXPLORER,
  LINEA_TESTNET_RPC_URL,
} from '../../../constants/urls';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      borderRadius: 10,
      minHeight: 470,
    },
    titleWrapper: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.muted,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      textAlign: 'center',
      fontSize: 18,
      marginVertical: 12,
      marginHorizontal: 20,
      color: colors.text.default,
      ...fontStyles.bold,
    },
    otherNetworksHeader: {
      marginTop: 0,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.muted,
    },
    networksWrapper: {
      flex: 1,
    },
    network: {
      borderColor: colors.border.muted,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 20,
      paddingLeft: 45,
    },
    mainnet: {
      borderBottomWidth: 0,
      flexDirection: 'column',
    },
    networkInfo: {
      marginLeft: 15,
      flex: 1,
    },
    networkLabel: {
      fontSize: 16,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    footer: {
      marginVertical: 10,
      flexDirection: 'row',
      paddingBottom: 8,
    },
    footerButton: {
      flex: 1,
      alignContent: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 20,
    },
    networkIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
    },
    networkWrapper: {
      flex: 0,
      flexDirection: 'row',
    },
    selected: {
      position: 'absolute',
      marginLeft: 20,
      marginTop: 20,
    },
    mainnetSelected: {
      marginLeft: -30,
      marginTop: 3,
    },
    closeIcon: {
      position: 'absolute',
      right: 0,
      padding: 15,
      color: colors.icon.default,
    },
    text: {
      textAlign: 'center',
      color: colors.text.default,
      fontSize: 10,
      marginTop: 4,
    },
  });

/**
 * View that contains the list of all the available networks
 */
export class NetworkList extends PureComponent {
  static propTypes = {
    /**
     * An function to handle the close event
     */
    onClose: PropTypes.func,
    /**
     * A list of custom RPCs to provide the user
     */
    frequentRpcList: PropTypes.array,
    /**
     * Current network provider configuration
     */
    providerConfig: PropTypes.object,
    /**
     * Indicates whether third party API mode is enabled
     */
    thirdPartyApiMode: PropTypes.bool,
    /**
     * Show invalid custom network alert for networks without a chain ID
     */
    showInvalidCustomNetworkAlert: PropTypes.func,
    /**
     * A function that handles the network selection
     */
    onNetworkSelected: PropTypes.func,
    /**
     * 	A function that handles switching to info modal
     */
    switchModalContent: PropTypes.func,
    /**
     * 	returns the network onboarding state
     */
    networkOnboardedState: PropTypes.array,
    /**
     * react-navigation object used for switching between screens
     */
    navigation: PropTypes.object,
    /**
     * Boolean indicating if switching network action should result in popping back to the wallet.
     */
    shouldNetworkSwitchPopToWallet: PropTypes.bool,
    /**
     * Current Bottom nav bar route.
     */
    currentBottomNavRoute: PropTypes.string,
  };

  getOtherNetworks = () => getAllNetworks().slice(1);

  handleNetworkSelected = (type, ticker, url) => {
    const {
      networkOnboardedState,
      switchModalContent,
      onClose,
      onNetworkSelected,
    } = this.props;
    const networkOnboarded = networkOnboardedState.filter(
      (item) => item.network === sanitizeUrl(url),
    );
    if (networkOnboarded.length === 0) {
      switchModalContent();
    } else {
      onClose(false);
    }
    AnalyticsV2.trackEvent(MetaMetricsEvents.NETWORK_SWITCHED, {
      chain_id: type,
      source: this.props.currentBottomNavRoute,
      symbol: ticker,
    });

    return onNetworkSelected(type, ticker, url, networkOnboardedState);
  };

  onNetworkChange = (type) => {
    this.handleNetworkSelected(type, ETH, type);
    const { NetworkController, CurrencyRateController } = Engine.context;
    CurrencyRateController.setNativeCurrency('ETH');
    NetworkController.setProviderType(type);
    this.props.thirdPartyApiMode &&
      setTimeout(() => {
        Engine.refreshTransactionHistory();
      }, 1000);
  };

  closeModal = () => {
    this.props.onClose(true);
  };

  onSetRpcTarget = async (rpcTarget) => {
    const { frequentRpcList } = this.props;
    const { PreferencesController, NetworkController, CurrencyRateController } =
      Engine.context;

    const isLineaTestnetInFrequentRpcList =
      frequentRpcList.findIndex(
        (frequentRpc) =>
          frequentRpc.chainId === NETWORKS_CHAIN_ID.LINEA_TESTNET,
      ) !== -1;

    let rpc = frequentRpcList.find(({ rpcUrl }) => rpcUrl === rpcTarget);

    if (
      !isLineaTestnetInFrequentRpcList &&
      rpcTarget === new URL(LINEA_TESTNET_RPC_URL).href
    ) {
      const url = new URLPARSE(LINEA_TESTNET_RPC_URL);
      const decimalChainId = getDecimalChainId(NETWORKS_CHAIN_ID.LINEA_TESTNET);
      PreferencesController.addToFrequentRpcList(
        url.href,
        decimalChainId,
        LINEA_TESTNET_TICKER,
        LINEA_TESTNET_NICKNAME,
        {
          blockExplorerUrl: LINEA_TESTNET_BLOCK_EXPLORER,
        },
      );
      const analyticsParamsAdd = {
        chain_id: decimalChainId,
        source: 'Popular network list',
        symbol: LINEA_TESTNET_TICKER,
      };

      AnalyticsV2.trackEvent(
        MetaMetricsEvents.NETWORK_ADDED,
        analyticsParamsAdd,
      );
      rpc = {
        rpcUrl: url.href,
        chainId: decimalChainId,
        ticker: LINEA_TESTNET_TICKER,
        nickname: LINEA_TESTNET_NICKNAME,
      };
    }

    const { rpcUrl, chainId, ticker, nickname } = rpc;
    const useRpcName = nickname || sanitizeUrl(rpcUrl);
    const useTicker = ticker || PRIVATENETWORK;
    this.handleNetworkSelected(useRpcName, useTicker, sanitizeUrl(rpcUrl));

    // If the network does not have chainId then show invalid custom network alert
    const chainIdNumber = parseInt(chainId, 10);
    if (!isSafeChainId(chainIdNumber)) {
      this.props.onClose(false);
      this.props.showInvalidCustomNetworkAlert(rpcTarget);
      return;
    }

    CurrencyRateController.setNativeCurrency(ticker);
    NetworkController.setRpcTarget(rpcUrl, chainId, ticker, nickname);

    AnalyticsV2.trackEvent(MetaMetricsEvents.NETWORK_SWITCHED, {
      chain_id: chainId,
      source: this.props.currentBottomNavRoute,
      symbol: ticker,
    });
  };

  getStyles = () => {
    const colors = this.context.colors || mockTheme.colors;
    return createStyles(colors);
  };

  networkElement = (
    selected,
    onPress,
    name,
    image,
    i,
    network,
    isCustomRpc,
    color,
    testId,
  ) => {
    const styles = this.getStyles();

    return (
      <TouchableOpacity
        style={styles.network}
        key={`network-${i}`}
        onPress={() => onPress(network)} // eslint-disable-line
        {...generateTestId(Platform, testId)}
      >
        <View
          {...generateTestId(Platform, `${testId}-selected`)}
          style={styles.selected}
        >
          {selected}
        </View>
        {isCustomRpc ? (
          <AvatarNetwork
            variant={AvatarVariants.Network}
            name={name}
            imageSource={image}
            style={styles.networkIcon}
            size={AvatarSize.Xs}
          />
        ) : null}
        {!isCustomRpc &&
          (image ? (
            <ImageIcon
              image={network.toUpperCase()}
              style={styles.networkIcon}
            />
          ) : (
            <View style={[styles.networkIcon, { backgroundColor: color }]}>
              <Text style={styles.text}>{name[0]}</Text>
            </View>
          ))}
        <View style={styles.networkInfo}>
          <Text numberOfLines={1} style={styles.networkLabel}>
            {name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  renderOtherNetworks = () => {
    const { providerConfig } = this.props;
    const colors = this.context.colors || mockTheme.colors;

    return this.getOtherNetworks().map((network, i) => {
      const { name, imageSource, color, testId } = Networks[network];
      const isCustomRpc = false;
      const selected =
        providerConfig.type === network ? (
          <Icon name="check" size={20} color={colors.icon.default} />
        ) : null;
      return this.networkElement(
        selected,
        this.onNetworkChange,
        name,
        imageSource,
        i,
        network,
        isCustomRpc,
        color,
        testId,
      );
    });
  };

  renderRpcNetworks = () => {
    const { frequentRpcList, providerConfig } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    let rpcList = frequentRpcList;

    rpcList = frequentRpcList.filter(
      ({ chainId }) => chainId !== NETWORKS_CHAIN_ID.LINEA_TESTNET,
    );

    return rpcList.map(({ nickname, rpcUrl, chainId }, i) => {
      const { name } = { name: nickname || rpcUrl, chainId, color: null };
      const image = getNetworkImageSource({ chainId });
      const isCustomRpc = true;
      const rpcTargetHref =
        providerConfig.rpcTarget && new URL(providerConfig.rpcTarget)?.href;
      const rpcURL = new URL(rpcUrl);
      const isSameRPC = rpcTargetHref === rpcURL.href;
      const selectedIcon =
        isSameRPC && providerConfig.type === RPC ? (
          <Icon name="check" size={20} color={colors.icon.default} />
        ) : null;
      return this.networkElement(
        selectedIcon,
        this.onSetRpcTarget,
        name,
        image,
        i,
        rpcUrl,
        isCustomRpc,
      );
    });
  };

  renderMainnet() {
    const { providerConfig } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = this.getStyles();
    // Do not check using chainId. This check needs to specifically use `mainnet`.
    const checkIcon =
      providerConfig.type === MAINNET ? (
        <Icon name="check" size={15} color={colors.icon.default} />
      ) : null;
    const { name: mainnetName } = Networks.mainnet;

    return (
      <View style={styles.mainnetHeader}>
        <TouchableOpacity
          style={[styles.network, styles.mainnet]}
          key={`network-mainnet`}
          onPress={() => this.onNetworkChange(MAINNET)} // eslint-disable-line
          testID={'network-name'}
        >
          <View style={styles.networkWrapper}>
            <View style={[styles.selected, styles.mainnetSelected]}>
              {checkIcon}
            </View>
            <ImageIcon image="ETHEREUM" style={styles.networkIcon} />
            <View style={styles.networkInfo}>
              <Text style={styles.networkLabel}>{mainnetName}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  renderNonInfuraNetwork = (chainId, rpcUrl, nickname) => {
    const { frequentRpcList, providerConfig } = this.props;
    const colors = this.context.colors || mockTheme.colors;

    const { name } = { name: nickname || rpcUrl, chainId, color: null };
    const image = getNetworkImageSource({ chainId });
    const isCustomRpc = true;
    const rpcTargetHref =
      providerConfig.rpcTarget && new URL(providerConfig.rpcTarget)?.href;
    const rpcURL = new URL(rpcUrl);
    const isSameRPC = rpcTargetHref === rpcURL.href;
    const selectedIcon =
      isSameRPC && providerConfig.type === RPC ? (
        <Icon name="check" size={20} color={colors.icon.default} />
      ) : null;
    const i = frequentRpcList.findIndex(
      (frequentRpc) => frequentRpc.chainId === chainId,
    );
    const networkIndex = i !== -1 ? i : frequentRpcList.length;

    return this.networkElement(
      selectedIcon,
      this.onSetRpcTarget,
      name,
      image,
      networkIndex,
      rpcURL.href,
      isCustomRpc,
    );
  };

  goToNetworkSettings = () => {
    const { shouldNetworkSwitchPopToWallet } = this.props;
    this.props.onClose(false);
    this.props.navigation.navigate('SettingsView', {
      screen: 'SettingsFlow',
      params: {
        screen: 'NetworkSettings',
        params: { isFullScreenModal: true, shouldNetworkSwitchPopToWallet },
      },
    });
  };

  render = () => {
    const styles = this.getStyles();
    return (
      <SafeAreaView
        style={styles.wrapper}
        {...generateTestId(Platform, NETWORK_LIST_MODAL_CONTAINER_ID)}
      >
        <View style={styles.titleWrapper}>
          <Text
            testID={'networks-list-title'}
            style={styles.title}
            onPress={this.closeSideBar}
          >
            {strings('networks.title')}
          </Text>
          <Ionicons
            onPress={this.closeModal}
            name={'ios-close'}
            size={30}
            style={styles.closeIcon}
            {...generateTestId(Platform, NETWORK_LIST_CLOSE_ICON)}
          />
        </View>
        <ScrollView style={styles.networksWrapper} testID={NETWORK_SCROLL_ID}>
          {this.renderMainnet()}
          {this.renderRpcNetworks()}
          {this.renderOtherNetworks()}
          {this.renderNonInfuraNetwork(
            NETWORKS_CHAIN_ID.LINEA_TESTNET,
            LINEA_TESTNET_RPC_URL,
            LINEA_TESTNET_NICKNAME,
          )}
        </ScrollView>
        <View style={styles.footer}>
          <StyledButton
            type="confirm"
            onPress={this.goToNetworkSettings}
            containerStyle={styles.footerButton}
            testID={ADD_NETWORK_BUTTON}
          >
            {strings('app_settings.add_network_title')}
          </StyledButton>
        </View>
      </SafeAreaView>
    );
  };
}

const mapStateToProps = (state) => ({
  providerConfig: selectProviderConfig(state),
  currentBottomNavRoute: state.navigation.currentBottomNavRoute,
  frequentRpcList:
    state.engine.backgroundState.PreferencesController.frequentRpcList,
  thirdPartyApiMode: state.privacy.thirdPartyApiMode,
  networkOnboardedState: state.networkOnboarded.networkOnboardedState,
  shouldNetworkSwitchPopToWallet: state.modals.shouldNetworkSwitchPopToWallet,
});

NetworkList.contextType = ThemeContext;

export default connect(mapStateToProps)(NetworkList);
