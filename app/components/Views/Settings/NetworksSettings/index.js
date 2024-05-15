import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { connect } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import ActionSheet from '@metamask/react-native-actionsheet';
import { fontStyles } from '../../../../styles/common';
import CustomText from '../../../../components/Base/Text';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { strings } from '../../../../../locales/i18n';
import Networks, {
  getAllNetworks,
  getNetworkImageSource,
  isDefaultMainnet,
  isLineaMainnet,
} from '../../../../util/networks';
import StyledButton from '../../../UI/StyledButton';
import Engine from '../../../../core/Engine';
import { LINEA_MAINNET, MAINNET, RPC } from '../../../../constants/network';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { mockTheme, ThemeContext } from '../../../../util/theme';
import ImageIcons from '../../../UI/ImageIcon';
import { ADD_NETWORK_BUTTON } from '../../../../../wdio/screen-objects/testIDs/Screens/NetworksScreen.testids';
import { compareSanitizedUrl } from '../../../../util/sanitizeUrl';
import {
  selectNetworkConfigurations,
  selectProviderConfig,
} from '../../../../selectors/networkController';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import AvatarNetwork from '../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import Routes from '../../../../constants/navigation/Routes';
import { NetworksViewSelectorsIDs } from '../../../../../e2e/selectors/Settings/NetworksView.selectors';
import { updateIncomingTransactions } from '../../../../util/transaction-controller';
import { NetworksTicker } from '@metamask/controller-utils';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 24,
      marginBottom: 24,
    },
    networkIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      marginTop: 2,
      marginRight: 16,
    },
    network: {
      flex: 1,
      flexDirection: 'row',
      paddingVertical: 12,
      alignItems: 'center',
    },
    networkWrapper: {
      flex: 0,
      flexDirection: 'row',
      alignItems: 'center',
    },
    networkLabel: {
      fontSize: 16,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    sectionLabel: {
      fontSize: 14,
      paddingVertical: 12,
      color: colors.text.default,
      ...fontStyles.bold,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.border.default,
      color: colors.text.default,
    },
    input: {
      flex: 1,
      fontSize: 14,
      color: colors.text.default,
      ...fontStyles.normal,
      paddingLeft: 10,
    },
    icon: {
      marginLeft: 8,
    },
    no_match_text: {
      marginVertical: 10,
    },
    text: {
      textAlign: 'center',
      color: colors.text.default,
      fontSize: 10,
      marginTop: 4,
    },
  });

/**
 * Main view for app configurations
 */
class NetworksSettings extends PureComponent {
  static propTypes = {
    /**
     * Network configurations
     */
    networkConfigurations: PropTypes.object,
    /**
     * Object that represents the navigator
     */
    navigation: PropTypes.object,
    /**
     * Current network provider configuration
     */
    providerConfig: PropTypes.object,
  };

  actionSheet = null;
  networkToRemove = null;

  state = {
    searchString: '',
    filteredNetworks: [],
  };

  updateNavBar = () => {
    const { navigation } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.networks_title'),
        navigation,
        false,
        colors,
      ),
    );
  };

  componentDidMount = () => {
    this.updateNavBar();
  };

  componentDidUpdate = (prevProps) => {
    if (this.props.networkConfigurations !== prevProps.networkConfigurations) {
      this.handleSearchTextChange(this.state.searchString);
    }

    this.updateNavBar();
  };

  getOtherNetworks = () => getAllNetworks().slice(2);

  onNetworkPress = (networkTypeOrRpcUrl) => {
    const { navigation } = this.props;
    navigation.navigate(Routes.ADD_NETWORK, {
      network: networkTypeOrRpcUrl,
    });
  };

  onAddNetwork = () => {
    const { navigation } = this.props;
    navigation.navigate(Routes.ADD_NETWORK);
  };

  showRemoveMenu = (networkTypeOrRpcUrl) => {
    this.networkToRemove = networkTypeOrRpcUrl;
    this.actionSheet.show();
  };

  switchToMainnet = () => {
    const { NetworkController, CurrencyRateController } = Engine.context;

    CurrencyRateController.updateExchangeRate(NetworksTicker.mainnet);
    NetworkController.setProviderType(MAINNET);

    setTimeout(async () => {
      await updateIncomingTransactions();
    }, 1000);
  };

  removeNetwork = () => {
    // Check if it's the selected network and then switch to mainnet first
    const { providerConfig } = this.props;
    if (
      compareSanitizedUrl(providerConfig.rpcUrl, this.networkToRemove) &&
      providerConfig.type === RPC
    ) {
      this.switchToMainnet();
    }
    const { networkConfigurations } = this.props;
    const entry = Object.entries(networkConfigurations).find(
      ([, networkConfiguration]) =>
        networkConfiguration.rpcUrl === this.networkToRemove,
    );
    if (!entry) {
      throw new Error(
        `Unable to find network with RPC URL ${this.networkToRemove}`,
      );
    }
    const [networkConfigurationId] = entry;
    const { NetworkController } = Engine.context;
    NetworkController.removeNetworkConfiguration(networkConfigurationId);
    this.setState({ filteredNetworks: [] });
  };

  createActionSheetRef = (ref) => {
    this.actionSheet = ref;
  };

  onActionSheetPress = (index) => (index === 0 ? this.removeNetwork() : null);

  networkElement(name, image, i, networkTypeOrRpcUrl, isCustomRPC, color) {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    return (
      <View key={`network-${networkTypeOrRpcUrl}`}>
        {
          // Do not change. This logic must check for 'mainnet' and is used for rendering the out of the box mainnet when searching.
          isDefaultMainnet(networkTypeOrRpcUrl) ? (
            this.renderMainnet()
          ) : isLineaMainnet(networkTypeOrRpcUrl) ? (
            this.renderLineaMainnet()
          ) : (
            <TouchableOpacity
              key={`network-${i}`}
              onPress={() => this.onNetworkPress(networkTypeOrRpcUrl)}
              onLongPress={() =>
                isCustomRPC && this.showRemoveMenu(networkTypeOrRpcUrl)
              }
            >
              <View style={styles.network}>
                {isCustomRPC ? (
                  <AvatarNetwork
                    variant={AvatarVariant.Network}
                    name={name}
                    imageSource={image}
                    style={styles.networkIcon}
                    size={AvatarSize.Xs}
                  />
                ) : null}
                {!isCustomRPC &&
                  (image ? (
                    <ImageIcons
                      image={networkTypeOrRpcUrl.toUpperCase()}
                      style={styles.networkIcon}
                    />
                  ) : (
                    <View
                      style={[styles.networkIcon, { backgroundColor: color }]}
                    >
                      <Text style={styles.text}>{name[0]}</Text>
                    </View>
                  ))}
                <Text style={styles.networkLabel}>{name}</Text>
                {!isCustomRPC && (
                  <FontAwesome
                    name="lock"
                    size={20}
                    color={colors.icon.default}
                    style={styles.icon}
                  />
                )}
              </View>
            </TouchableOpacity>
          )
        }
      </View>
    );
  }

  renderOtherNetworks() {
    return this.getOtherNetworks().map((networkType, i) => {
      const { name, imageSource, color } = Networks[networkType];
      return this.networkElement(
        name,
        imageSource,
        i,
        networkType,
        false,
        color,
      );
    });
  }

  renderRpcNetworks = () => {
    const { networkConfigurations } = this.props;
    return Object.values(networkConfigurations).map(
      ({ rpcUrl, nickname, chainId }, i) => {
        const name = nickname || rpcUrl;
        const image = getNetworkImageSource({ chainId });
        return this.networkElement(name, image, i, rpcUrl, true);
      },
    );
  };

  renderRpcNetworksView = () => {
    const { networkConfigurations } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    if (Object.keys(networkConfigurations).length > 0) {
      return (
        <View testID={NetworksViewSelectorsIDs.CUSTOM_NETWORK_LIST}>
          <Text style={styles.sectionLabel}>
            {strings('app_settings.custom_network_name')}
          </Text>
          {this.renderRpcNetworks()}
        </View>
      );
    }
  };

  renderMainnet() {
    const { name: mainnetName } = Networks.mainnet;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.mainnetHeader}>
        <TouchableOpacity
          style={styles.network}
          key={`network-${MAINNET}`}
          onPress={() => this.onNetworkPress(MAINNET)}
        >
          <View style={styles.networkWrapper}>
            <ImageIcons image="ETHEREUM" style={styles.networkIcon} />
            <View style={styles.networkInfo}>
              <Text style={styles.networkLabel}>{mainnetName}</Text>
            </View>
          </View>
          <FontAwesome
            name="lock"
            size={20}
            color={colors.icon.default}
            style={styles.icon}
          />
        </TouchableOpacity>
      </View>
    );
  }

  renderLineaMainnet() {
    const { name: lineaMainnetName } = Networks['linea-mainnet'];
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.mainnetHeader}>
        <TouchableOpacity
          style={styles.network}
          key={`network-${LINEA_MAINNET}`}
          onPress={() => this.onNetworkPress(LINEA_MAINNET)}
        >
          <View style={styles.networkWrapper}>
            <ImageIcons image="LINEA-MAINNET" style={styles.networkIcon} />
            <View style={styles.networkInfo}>
              <Text style={styles.networkLabel}>{lineaMainnetName}</Text>
            </View>
          </View>
          <FontAwesome
            name="lock"
            size={20}
            color={colors.icon.default}
            style={styles.icon}
          />
        </TouchableOpacity>
      </View>
    );
  }

  handleSearchTextChange = (text) => {
    this.setState({ searchString: text });
    const defaultNetwork = getAllNetworks().map((networkType, i) => {
      const { color, name, chainId } = Networks[networkType];
      return {
        name,
        color,
        networkTypeOrRpcUrl: networkType,
        isCustomRPC: false,
        chainId,
      };
    });
    const customRPC = Object.values(this.props.networkConfigurations).map(
      (networkConfiguration, i) => {
        const { color, name, url, chainId } = {
          name: networkConfiguration.nickname || networkConfiguration.rpcUrl,
          url: networkConfiguration.rpcUrl,
          color: null,
          chainId: networkConfiguration.chainId,
        };
        return {
          name,
          color,
          i,
          networkTypeOrRpcUrl: url,
          isCustomRPC: true,
          chainId,
        };
      },
    );

    const allActiveNetworks = defaultNetwork.concat(customRPC);
    const searchResult = allActiveNetworks.filter(({ name }) =>
      name.toLowerCase().includes(text.toLowerCase()),
    );
    this.setState({ filteredNetworks: searchResult });
  };

  clearSearchInput = () =>
    this.setState({ searchString: '', filteredNetworks: [] });

  filteredResult = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    if (this.state.filteredNetworks.length > 0) {
      return this.state.filteredNetworks.map((data, i) => {
        const { networkTypeOrRpcUrl, chainId, name, color, isCustomRPC } = data;
        const image = getNetworkImageSource({ chainId });
        return (
          // TODO: remove this check when linea mainnet is ready
          networkTypeOrRpcUrl !== LINEA_MAINNET &&
          this.networkElement(
            name,
            image || color,
            i,
            networkTypeOrRpcUrl,
            isCustomRPC,
          )
        );
      });
    }
    return (
      <CustomText style={styles.no_match_text}>
        {strings('networks.no_match')}
      </CustomText>
    );
  };

  render() {
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance;
    const styles = createStyles(colors);

    return (
      <View
        style={styles.wrapper}
        testID={NetworksViewSelectorsIDs.NETWORK_CONTAINER}
      >
        <View style={styles.inputWrapper}>
          <Icon name="ios-search" size={20} color={colors.icon.default} />
          <TextInput
            style={styles.input}
            placeholder={strings('networks.search')}
            placeholderTextColor={colors.text.default}
            value={this.state.searchString}
            onChangeText={this.handleSearchTextChange}
            testID={NetworksViewSelectorsIDs.SEARCH_NETWORK_INPUT_BOX_ID}
          />
          {this.state.searchString.length > 0 && (
            <Icon
              name="ios-close"
              size={20}
              color={colors.icon.default}
              onPress={this.clearSearchInput}
              testID={NetworksViewSelectorsIDs.CLOSE_ICON}
            />
          )}
        </View>
        <ScrollView style={styles.networksWrapper}>
          {this.state.searchString.length > 0 ? (
            this.filteredResult()
          ) : (
            <>
              <Text style={styles.sectionLabel}>
                {strings('app_settings.mainnet')}
              </Text>
              {this.renderMainnet()}
              {this.renderLineaMainnet()}
              {this.renderRpcNetworksView()}
              <Text style={styles.sectionLabel}>
                {strings('app_settings.test_network_name')}
              </Text>
              {this.renderOtherNetworks()}
            </>
          )}
        </ScrollView>
        <StyledButton
          type="confirm"
          onPress={this.onAddNetwork}
          containerStyle={styles.syncConfirm}
          testID={ADD_NETWORK_BUTTON}
        >
          {strings('app_settings.network_add_network')}
        </StyledButton>
        <ActionSheet
          ref={this.createActionSheetRef}
          title={strings('app_settings.remove_network_title')}
          options={[
            strings('app_settings.remove_network'),
            strings('app_settings.cancel_remove_network'),
          ]}
          cancelButtonIndex={1}
          destructiveButtonIndex={0}
          onPress={this.onActionSheetPress}
          theme={themeAppearance}
        />
      </View>
    );
  }
}

NetworksSettings.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  providerConfig: selectProviderConfig(state),
  networkConfigurations: selectNetworkConfigurations(state),
});

export default connect(mapStateToProps)(NetworksSettings);
