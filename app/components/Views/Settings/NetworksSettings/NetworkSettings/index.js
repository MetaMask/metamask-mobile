import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  SafeAreaView,
  Linking,
} from 'react-native';
import { connect } from 'react-redux';
import { typography } from '@metamask/design-tokens';
import isUrl from 'is-url';
import {
  fontStyles,
  colors as staticColors,
} from '../../../../../styles/common';
import { getNavigationOptionsTitle } from '../../../../UI/Navbar';
import { strings } from '../../../../../../locales/i18n';
import Networks, {
  isPrivateConnection,
  getAllNetworks,
  getIsNetworkOnboarded,
} from '../../../../../util/networks';
import Engine from '../../../../../core/Engine';
import { isWebUri } from 'valid-url';
import URL from 'url-parse';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import BigNumber from 'bignumber.js';
import { jsonRpcRequest } from '../../../../../util/jsonRpcRequest';
import Logger from '../../../../../util/Logger';
import { isPrefixedFormattedHexString } from '../../../../../util/number';
import AppConstants from '../../../../../core/AppConstants';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import { PopularList } from '../../../../../util/networks/customNetworks';
import InfoModal from '../../../../UI/Swaps/components/InfoModal';
import { PRIVATENETWORK, RPC } from '../../../../../constants/network';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import { showNetworkOnboardingAction } from '../../../../../actions/onboardNetwork';
import sanitizeUrl, {
  compareSanitizedUrl,
} from '../../../../../util/sanitizeUrl';
import hideKeyFromUrl from '../../../../../util/hideKeyFromUrl';
import { themeAppearanceLight } from '../../../../../constants/storage';
import { scale, moderateScale } from 'react-native-size-matters';
import CustomNetwork from './CustomNetworkView/CustomNetwork';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import {
  selectNetworkConfigurations,
  selectProviderConfig,
} from '../../../../../selectors/networkController';
import { regex } from '../../../../../../app/util/regex';
import { NetworksViewSelectorsIDs } from '../../../../../../e2e/selectors/Settings/NetworksView.selectors';
import {
  NetworksTicker,
  isSafeChainId,
  toHex,
} from '@metamask/controller-utils';
import { CustomDefaultNetworkIDs } from '../../../../../../e2e/selectors/Onboarding/CustomDefaultNetwork.selectors';
import { updateIncomingTransactions } from '../../../../../util/transaction-controller';
import { withMetricsAwareness } from '../../../../../components/hooks/useMetrics';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import Routes from '../../../../../constants/navigation/Routes';
import { selectUseSafeChainsListValidation } from '../../../../../../app/selectors/preferencesController';
import withIsOriginalNativeToken from './withIsOriginalNativeToken';
import { compose } from 'redux';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { isNetworkUiRedesignEnabled } from '../../../../../util/networks/isNetworkUiRedesignEnabled';
import Cell, {
  CellVariant,
} from '../../../../../component-library/components/Cells/Cell';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';
import ButtonLink from '../../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import ButtonPrimary from '../../../../../component-library/components/Buttons/Button/variants/ButtonPrimary';
import { RpcEndpointType } from '@metamask/network-controller';
import { AvatarVariant } from '../../../../../component-library/components/Avatars/Avatar';
import ReusableModal from '../../../../../components/UI/ReusableModal';
import Device from '../../../../../util/device';
import { ScrollView } from 'react-native-gesture-handler';

const createStyles = (colors) =>
  StyleSheet.create({
    base: {
      paddingHorizontal: 16,
    },
    baseAll: {
      padding: 16,
    },
    addRpcButton: {
      position: 'absolute',
      alignSelf: 'center',
    },
    screen: {
      flex: 1,
      paddingHorizontal: 24,
      paddingVertical: 16,
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.background.default,
    },
    container: {
      flex: 1,
    },
    headerText: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    scrollViewContent: {
      paddingBottom: 16,
    },
    scrollableBox: {
      height: 164,
      marginVertical: 10,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      bottom: 64,
    },
    footer: {
      height: 60,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
      bottom: 16,
      left: 0,
      right: 0,
      zIndex: 10, // Ensures it stays on top of other components
    },
    content: {
      justifyContent: 'center',
      paddingHorizontal: 16,
      flexGrow: 1,
    },
    addRpcNameButton: {
      paddingTop: 32,
      alignSelf: 'center',
    },
    sheet: {
      flexDirection: 'column',
      bottom: 0,
      top: Device.getDeviceHeight() * 0.5,
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      height: Device.getDeviceHeight() * 0.5,
    },
    sheetSmall: {
      position: 'absolute',
      bottom: 0,
      top: Device.getDeviceHeight() * 0.7,
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      height: Device.getDeviceHeight() * 0.3,
    },
    sheetRpcForm: {
      position: 'absolute',
      bottom: 0,
      top: Device.getDeviceHeight() * 0.3,
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      height: Device.getDeviceHeight() * 0.7,
    },
    sheetContent: {
      flex: 1,
      flexShrink: 1,
    },
    notch: {
      width: 48,
      height: 5,
      borderRadius: 4,
      backgroundColor: colors.border.default,
      marginTop: 4,
      alignSelf: 'center',
    },
    rpcMenu: {
      paddingHorizontal: 16,
      flex: 1,
    },
    wrapper: {
      backgroundColor: colors.background.default,
      flexGrow: 1,
      flexDirection: 'column',
    },
    informationWrapper: {
      flex: 1,
    },
    informationCustomWrapper: {
      paddingHorizontal: 20,
    },
    scrollWrapper: {
      flex: 1,
      paddingVertical: 12,
    },
    scrollWrapperOverlay: {
      flex: 1,
      paddingVertical: 12,
      opacity: 0.5,
    },
    onboardingInput: {
      borderColor: staticColors.transparent,
      padding: 0,
    },
    onboardingInputDisabled: {
      borderColor: colors.border.muted,
      color: colors.text.muted,
    },
    input: {
      ...fontStyles.normal,
      borderColor: colors.border.default,
      borderRadius: 5,
      borderWidth: 2,
      padding: 10,
      color: colors.text.default,
    },
    dropDownInput: {
      borderColor: colors.border.default,
      borderRadius: 5,
      borderWidth: 2,
    },
    inputWithError: {
      ...typography.sBodyMD,
      borderColor: colors.error.default,
      borderRadius: 5,
      borderWidth: 1,
      paddingTop: 2,
      paddingBottom: 12,
      paddingHorizontal: 12,
      color: colors.text.default,
    },
    inputWithFocus: {
      ...typography.sBodyMD,
      borderColor: colors.primary.default,
      borderRadius: 5,
      borderWidth: 2,
      paddingTop: 2,
      paddingBottom: 12,
      paddingHorizontal: 12,
      color: colors.text.default,
    },
    warningText: {
      ...fontStyles.normal,
      color: colors.error.default,
      marginTop: 4,
      paddingLeft: 2,
      paddingRight: 4,
    },
    warningContainer: {
      marginTop: 16,
      flexGrow: 1,
      flexShrink: 1,
    },
    newWarningContainer: {
      flexGrow: 1,
      flexShrink: 1,
    },
    heading: {
      fontSize: 16,
      color: colors.text.default,
      ...fontStyles.bold,
    },
    label: {
      fontSize: 14,
      paddingVertical: 12,
      color: colors.text.default,
      ...fontStyles.bold,
    },
    link: {
      color: colors.primary.default,
    },
    title: {
      fontSize: 20,
      paddingVertical: 12,
      color: colors.text.default,
      ...fontStyles.bold,
    },
    desc: {
      fontSize: 14,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    messageWarning: {
      paddingVertical: 2,
      fontSize: 14,
      color: colors.warning.default,
      ...typography.sBodyMD,
    },
    suggestionButton: {
      color: colors.text.default,
      paddingLeft: 2,
      paddingRight: 4,
      marginTop: 4,
    },
    inlineWarning: {
      paddingVertical: 2,
      fontSize: 14,
      color: colors.text.default,
      ...typography.sBodyMD,
    },
    inlineWarningMessage: {
      paddingVertical: 2,
      color: colors.warning.default,
      ...typography.sBodyMD,
    },
    buttonsWrapper: {
      marginVertical: 12,
      flexDirection: 'row',
      alignSelf: 'flex-end',
    },
    buttonsContainer: {
      flex: 1,
      flexDirection: 'column',
      alignSelf: 'flex-end',
    },
    editableButtonsContainer: {
      flex: 1,
      flexDirection: 'row',
    },
    networksWrapper: {
      marginTop: 12,
      paddingHorizontal: 20,
    },
    popularNetwork: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginVertical: 12,
    },
    tabUnderlineStyle: {
      height: 2,
      backgroundColor: colors.primary.default,
    },
    tabStyle: {
      paddingVertical: 8,
    },
    textStyle: {
      ...fontStyles.bold,
      fontSize: 14,
    },
    tabLabelStyle: {
      fontSize: scale(11),
    },
    popularNetworkImage: {
      width: 20,
      height: 20,
      marginRight: 10,
      borderRadius: 10,
    },
    popularWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    icon: {
      marginRight: moderateScale(12, 1.5),
      marginTop: 4,
    },
    button: {
      flex: 1,
    },
    disabledButton: {
      backgroundColor: colors.primary.muted,
    },
    cancel: {
      marginRight: 16,
    },
    blueText: {
      color: colors.primary.default,
      marginTop: 1,
    },
    bottomSection: {
      flex: 1,
      flexDirection: 'column',
    },
  });

const allNetworks = getAllNetworks();

const InfuraKey = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;

/**
 * Main view for app configurations
 */
export class NetworkSettings extends PureComponent {
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
     * Object that represents the current route info like params passed to it
     */
    route: PropTypes.object,
    /**
     * handles action for onboarding to a network
     */
    showNetworkOnboardingAction: PropTypes.func,
    /**
     * returns an array of onboarded networks
     */
    networkOnboardedState: PropTypes.object,
    /**
     * Checks if adding custom mainnet.
     */
    isCustomMainnet: PropTypes.bool,
    /**
     * Current network provider configuration
     */
    providerConfig: PropTypes.object,
    /**
     * Metrics injected by withMetricsAwareness HOC
     */
    metrics: PropTypes.object,

    /**
     * Checks if toggle verification is enabled
     */
    useSafeChainsListValidation: PropTypes.bool,

    /**
     * Matched object from third provider
     */
    matchedChainNetwork: PropTypes.object,
  };

  state = {
    rpcUrl: undefined,
    rpcName: undefined,
    rpcUrlFrom: undefined,
    rpcNameForm: '',
    rpcUrls: [],
    blockExplorerUrls: [],
    selectedRpcEndpointIndex: 0,
    blockExplorerUrl: undefined,
    blockExplorerUrlForm: undefined,
    nickname: undefined,
    chainId: undefined,
    ticker: undefined,
    editable: undefined,
    addMode: false,
    warningRpcUrl: undefined,
    warningChainId: undefined,
    warningSymbol: undefined,
    validatedRpcURL: true,
    validatedChainId: true,
    validatedSymbol: true,
    initialState: undefined,
    enableAction: false,
    inputWidth: { width: '99%' },
    showPopularNetworkModal: false,
    popularNetwork: {},
    showWarningModal: false,
    showNetworkDetailsModal: false,
    isNameFieldFocused: false,
    isSymbolFieldFocused: false,
    isRpcUrlFieldFocused: false,
    isChainIdFieldFocused: false,
    networkList: [],
    showMultiRpcAddModal: {
      isVisible: false,
    },
    showMultiBlockExplorerAddModal: {
      isVisible: false,
    },
    showAddRpcForm: {
      isVisible: false,
    },
    showAddBlockExplorerForm: {
      isVisible: false,
    },
  };

  inputRpcURL = React.createRef();
  inputNameRpcURL = React.createRef();
  inputChainId = React.createRef();
  inputSymbol = React.createRef();
  inputBlockExplorerURL = React.createRef();

  getOtherNetworks = () => allNetworks.slice(1);

  templateInfuraRpc = (endpoint) =>
    endpoint.endsWith('{infuraProjectId}')
      ? endpoint.replace('{infuraProjectId}', infuraProjectId ?? '')
      : endpoint;

  updateNavBar = () => {
    const { navigation, route } = this.props;
    const isCustomMainnet = route.params?.isCustomMainnet;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(
      getNavigationOptionsTitle(
        isCustomMainnet
          ? strings('app_settings.networks_default_title')
          : strings('app_settings.networks_title'),
        navigation,
        true,
        colors,
      ),
    );
  };

  componentDidMount = () => {
    this.updateNavBar();
    const { route, networkConfigurations } = this.props;

    const networkTypeOrRpcUrl = route.params?.network;

    // if network is main, don't show popular network
    let blockExplorerUrl,
      chainId,
      nickname,
      ticker,
      editable,
      rpcUrl,
      rpcUrls,
      blockExplorerUrls,
      rpcName,
      selectedRpcEndpointIndex;
    // If no navigation param, user clicked on add network
    if (networkTypeOrRpcUrl) {
      if (allNetworks.find((net) => networkTypeOrRpcUrl === net)) {
        const networkInformation = Networks[networkTypeOrRpcUrl];
        chainId = networkInformation.chainId.toString();

        nickname = networkConfigurations?.[chainId]?.name;
        editable = false;
        blockExplorerUrl =
          networkConfigurations?.[chainId]?.blockExplorerUrls[
          networkConfigurations?.[chainId]?.defaultBlockExplorerUrlIndex
          ];
        rpcUrl =
          networkConfigurations?.[chainId]?.rpcEndpoints[
            networkConfigurations?.[chainId]?.defaultRpcEndpointIndex
          ]?.url;
        rpcName =
          networkConfigurations?.[chainId]?.rpcEndpoints[
            networkConfigurations?.[chainId]?.defaultRpcEndpointIndex
          ]?.type ??
          networkConfigurations?.[chainId]?.rpcEndpoints[
            networkConfigurations?.[chainId]?.defaultRpcEndpointIndex
          ]?.name;
        rpcUrls = networkConfigurations?.[chainId]?.rpcEndpoints;
        blockExplorerUrls = networkConfigurations?.[chainId]?.blockExplorerUrls;

        ticker = networkConfigurations?.[chainId]?.nativeCurrency;
      } else {
        const networkConfiguration = Object.values(networkConfigurations).find(
          ({ rpcEndpoints, defaultRpcEndpointIndex }) =>
            rpcEndpoints[defaultRpcEndpointIndex].url === networkTypeOrRpcUrl ||
            rpcEndpoints[defaultRpcEndpointIndex].networkClientId ===
            networkTypeOrRpcUrl,
        );
        nickname = networkConfiguration?.name;
        chainId = networkConfiguration?.chainId;
        blockExplorerUrl =
          networkConfiguration?.blockExplorerUrls[
          networkConfiguration?.defaultBlockExplorerUrlIndex
          ];
        ticker = networkConfiguration?.nativeCurrency;
        editable = true;
        rpcUrl =
          networkConfigurations?.[chainId]?.rpcEndpoints[
            networkConfigurations?.[chainId]?.defaultRpcEndpointIndex
          ]?.url;
        rpcUrls = networkConfiguration?.rpcEndpoints;
        blockExplorerUrls = networkConfiguration?.blockExplorerUrls;
        rpcName =
          networkConfiguration?.rpcEndpoints[
            networkConfiguration?.defaultRpcEndpointIndex
          ]?.name ??
          networkConfiguration?.rpcEndpoints[
            networkConfiguration?.defaultRpcEndpointIndex
          ]?.type;

        selectedRpcEndpointIndex =
          networkConfiguration?.defaultRpcEndpointIndex;
      }

      const initialState =
        rpcUrl +
        blockExplorerUrl +
        nickname +
        chainId +
        ticker +
        editable +
        rpcUrls +
        blockExplorerUrls;
      this.setState({
        rpcUrl,
        rpcName,
        rpcUrls,
        blockExplorerUrls,
        selectedRpcEndpointIndex,
        blockExplorerUrl,
        nickname,
        chainId,
        ticker,
        editable,
        initialState,
      });
    } else {
      this.setState({ addMode: true });
    }

    setTimeout(() => {
      this.setState({
        inputWidth: { width: '100%' },
      });
    }, 100);
  };

  componentDidUpdate = (prevProps) => {
    this.updateNavBar();
    if (this.props.matchedChainNetwork !== prevProps.matchedChainNetwork) {
      this.validateRpcAndChainId();
    }
  };

  updateNetworkList = (networkList) => {
    this.setState({
      networkList,
    });
  };
  /**
   * Attempts to convert the given chainId to a decimal string, for display
   * purposes.
   *
   * Should be called with the props chainId whenever it is used to set the
   * component's state.
   *
   * @param {unknown} chainId - The chainId to convert.
   * @returns {string} The props chainId in decimal, or the original value if
   * it can't be converted.
   */
  getDecimalChainId(chainId) {
    if (!chainId || typeof chainId !== 'string' || !chainId.startsWith('0x')) {
      return chainId;
    }
    return parseInt(chainId, 16).toString(10);
  }

  isAnyModalVisible = () =>
    this.state.showMultiRpcAddModal.isVisible ||
    this.state.showMultiBlockExplorerAddModal.isVisible ||
    this.state.showAddRpcForm.isVisible ||
    this.state.showAddBlockExplorerForm.isVisible;

  validateRpcAndChainId = () => {
    const { rpcUrl, chainId } = this.state;

    if (rpcUrl && chainId) {
      const chainToMatch = this.props.matchedChainNetwork?.safeChainsList?.find(
        (network) => network.chainId === parseInt(chainId),
      );

      // This is a temporary hack to not include POL as a potential scam token while chainlist updates
      // TODO: This can be safely removed once safeChainsList updates from MATIC to POL
      if (parseInt(chainId) === 137) {
        chainToMatch.nativeCurrency.symbol = 'POL';
        chainToMatch.nativeCurrency.name = 'POL';
      }

      this.updateNetworkList(chainToMatch);
      this.validateName(chainToMatch);
      this.validateSymbol(chainToMatch);
    }
  };

  /**
   * Validates the chain ID by checking it against the `eth_chainId` return
   * value from the given RPC URL.
   * Assumes that all strings are non-empty and correctly formatted.
   *
   * @param {string} formChainId - Non-empty, hex or decimal number string from
   * the form.
   * @param {string} parsedChainId - The parsed, hex string chain ID.
   * @param {string} rpcUrl - The RPC URL from the form.
   */
  validateChainIdOnSubmit = async (formChainId, parsedChainId, rpcUrl) => {
    let errorMessage;
    let endpointChainId;
    let providerError;

    try {
      endpointChainId = await jsonRpcRequest(
        this.templateInfuraRpc(rpcUrl),
        'eth_chainId',
      );
    } catch (err) {
      Logger.error(err, 'Failed to fetch the chainId from the endpoint.');
      providerError = err;
    }

    if (providerError || typeof endpointChainId !== 'string') {
      errorMessage = strings('app_settings.failed_to_fetch_chain_id');
    } else if (parsedChainId !== endpointChainId) {
      // Here, we are in an error state. The endpoint should always return a
      // hexadecimal string. If the user entered a decimal string, we attempt
      // to convert the endpoint's return value to decimal before rendering it
      // in an error message in the form.
      if (!formChainId.startsWith('0x')) {
        try {
          const endpointChainIdNumber = new BigNumber(endpointChainId, 16);
          if (endpointChainIdNumber.isNaN()) {
            throw new Error('Invalid endpointChainId');
          }
          endpointChainId = endpointChainIdNumber.toString(10);
        } catch (err) {
          Logger.error(err, {
            endpointChainId,
            message: 'Failed to convert endpoint chain ID to decimal',
          });
        }
      }

      errorMessage = strings(
        'app_settings.endpoint_returned_different_chain_id',
        {
          chainIdReturned: endpointChainId,
        },
      );
    }

    if (errorMessage) {
      this.setState({ warningChainId: errorMessage });
      return false;
    }
    return true;
  };

  checkIfChainIdExists = async (chainId) => {
    const { networkConfigurations } = this.props;

    let hexChainId;
    try {
      // Convert the chainId to hex format
      hexChainId = toHex(chainId);
    } catch (error) {
      hexChainId = null;
    }

    // Check if any network configuration matches the given chainId
    const chainIdExists = Object.values(networkConfigurations).some(
      (item) => item.chainId === hexChainId,
    );

    // Return true if the chainId exists and the UI redesign is enabled, otherwise false
    return isNetworkUiRedesignEnabled() && chainIdExists;
  };

  checkIfRpcUrlExists = async (rpcUrl) => {
    // First, check custom networks in networkConfigurationsByChainId
    const checkCustomNetworks = Object.values(
      this.props.networkConfigurations,
    ).filter((item) =>
      item.rpcEndpoints.some((endpoint) => endpoint.url === rpcUrl),
    );

    if (checkCustomNetworks.length > 0) {
      return checkCustomNetworks;
    }

    // If no network exists with the given RPC URL
    return [];
  };

  checkIfNetworkExists = async (rpcUrl) => {
    const checkCustomNetworks = Object.values(
      this.props.networkConfigurations,
    ).filter((item) => item.rpcUrl === rpcUrl);

    if (checkCustomNetworks.length > 0) {
      if (!isNetworkUiRedesignEnabled()) {
        this.setState({
          warningRpcUrl: strings('app_settings.network_exists'),
        });
        return checkCustomNetworks;
      }

      return checkCustomNetworks;
    }
    const defaultNetworks = getAllNetworks().map((item) => Networks[item]);
    const checkDefaultNetworks = defaultNetworks.filter(
      (item) => Number(item.rpcUrl) === rpcUrl,
    );
    if (checkDefaultNetworks.length > 0) {
      return checkDefaultNetworks;
    }
    return [];
  };

  checkIfNetworkNotExistsByChainId = async (chainId) =>
    Object.values(this.props.networkConfigurations).filter(
      (item) => item.chainId !== chainId,
    );

  handleNetworkUpdate = async ({
    rpcUrl,
    chainId,
    nickname,
    ticker,
    blockExplorerUrl,
    blockExplorerUrls,
    rpcUrls,
    isNetworkExists,
    isCustomMainnet,
    shouldNetworkSwitchPopToWallet,
    navigation,
  }) => {
    const { NetworkController } = Engine.context;

    const url = new URL(rpcUrl);
    if (!isPrivateConnection(url.hostname)) {
      url.set('protocol', 'https:');
    }

    const existingNetwork = this.props.networkConfigurations[chainId];

    const indexRpc = rpcUrls.findIndex(({ url }) => url === rpcUrl);

    const blockExplorerIndex = blockExplorerUrls.findIndex(
      (url) => url === blockExplorerUrl,
    );

    const networkConfig = {
      blockExplorerUrls,
      chainId,
      rpcEndpoints: rpcUrls,
      nativeCurrency: ticker,
      name: nickname,
      defaultRpcEndpointIndex: indexRpc,
      defaultBlockExplorerUrlIndex:
        blockExplorerIndex !== -1 ? blockExplorerIndex : undefined,
    };

    if (isNetworkExists.length === 0) {
      await NetworkController.updateNetwork(
        existingNetwork.chainId,
        networkConfig,
        existingNetwork.chainId === chainId
          ? {
            replacementSelectedRpcEndpointIndex: indexRpc,
          }
          : undefined,
      );
    } else {
      await NetworkController.addNetwork({
        ...networkConfig,
      });
    }

    isCustomMainnet
      ? navigation.navigate('OptinMetrics')
      : shouldNetworkSwitchPopToWallet
        ? navigation.navigate('WalletView')
        : navigation.goBack();
  };

  /**
   * Add or update network configuration, then switch networks
   */
  addRpcUrl = async () => {
    const {
      rpcUrl,
      chainId: stateChainId,
      nickname,
      blockExplorerUrls,
      blockExplorerUrl,
      enableAction,
      rpcUrls,
      addMode,
      editable,
    } = this.state;

    const ticker = this.state.ticker && this.state.ticker.toUpperCase();
    const { navigation, networkOnboardedState, route } = this.props;
    const isCustomMainnet = route.params?.isCustomMainnet;

    const shouldNetworkSwitchPopToWallet =
      route.params?.shouldNetworkSwitchPopToWallet ?? true;
    // Check if CTA is disabled
    const isCtaDisabled =
      !enableAction || this.disabledByChainId() || this.disabledBySymbol();

    if (isCtaDisabled) {
      return;
    }

    // Conditionally check existence of network (Only check in Add Mode)
    let isNetworkExists;
    if (isNetworkUiRedesignEnabled()) {
      isNetworkExists = addMode
        ? await this.checkIfNetworkNotExistsByChainId(stateChainId)
        : [];
    } else {
      isNetworkExists = editable ? [] : await this.checkIfNetworkExists(rpcUrl);
    }

    const isOnboarded = getIsNetworkOnboarded(
      stateChainId,
      networkOnboardedState,
    );

    const nativeToken = ticker || PRIVATENETWORK;
    const networkType = nickname || rpcUrl;
    const networkUrl = sanitizeUrl(rpcUrl);
    // Prevent the network switch modal from showing post onboarding.
    const showNetworkOnboarding = isCustomMainnet ? false : isOnboarded;

    const formChainId = stateChainId.trim().toLowerCase();

    // Ensure chainId is a 0x-prefixed, lowercase hex string
    let chainId = formChainId;
    if (!chainId.startsWith('0x')) {
      chainId = `0x${parseInt(chainId, 10).toString(16)}`;
    }

    if (!(await this.validateChainIdOnSubmit(formChainId, chainId, rpcUrl))) {
      return;
    }

    await this.handleNetworkUpdate({
      rpcUrl,
      chainId,
      nickname,
      ticker,
      blockExplorerUrl,
      blockExplorerUrls,
      rpcUrls,
      isNetworkExists,
      isCustomMainnet,
      shouldNetworkSwitchPopToWallet,
      navigation,
      nativeToken,
      networkType,
      networkUrl,
      showNetworkOnboarding,
    });
  };

  /**
   * Validates rpc url, setting a warningRpcUrl if is invalid
   * It also changes validatedRpcURL to true, indicating that was validated
   */
  validateRpcUrl = async (rpcUrl) => {
    const isNetworkExists = await this.checkIfNetworkExists(rpcUrl);
    const isRpcExists = await this.checkIfRpcUrlExists(rpcUrl);

    if (!isWebUri(rpcUrl)) {
      const appendedRpc = `http://${rpcUrl}`;
      if (isWebUri(appendedRpc)) {
        this.setState({
          warningRpcUrl: strings('app_settings.invalid_rpc_prefix'),
        });
      } else {
        this.setState({
          warningRpcUrl: strings('app_settings.invalid_rpc_url'),
        });
      }
      return false;
    }

    if (isRpcExists.length > 0) {
      return this.setState({
        warningRpcUrl: strings('app_settings.invalid_rpc_url'),
      });
    }

    if (isNetworkExists.length > 0) {
      if (isNetworkUiRedesignEnabled()) {
        return this.setState({
          validatedRpcURL: false,
          warningRpcUrl: strings(
            'app_settings.url_associated_to_another_chain_id',
          ),
        });
      }
      return this.setState({
        validatedRpcURL: true,
        warningRpcUrl: strings('app_settings.network_exists'),
      });
    }
    const url = new URL(rpcUrl);
    const privateConnection = isPrivateConnection(url.hostname);
    if (!privateConnection && url.protocol === 'http:') {
      this.setState({
        warningRpcUrl: strings('app_settings.invalid_rpc_prefix'),
      });
      return false;
    }
    this.setState({ validatedRpcURL: true, warningRpcUrl: undefined });

    this.validateRpcAndChainId();

    return true;
  };

  /**
   * Validates that chain id is a valid integer number, setting a warningChainId if is invalid
   */
  validateChainId = async () => {
    const { chainId, rpcUrl, editable } = this.state;
    const isChainIdExists = await this.checkIfChainIdExists(chainId);
    const isNetworkExists = await this.checkIfNetworkExists(rpcUrl);

    if (
      isChainIdExists &&
      isNetworkExists.length > 0 &&
      isNetworkUiRedesignEnabled() &&
      !editable
    ) {
      return this.setState({
        validateChainId: true,
        warningChainId: strings(
          'app_settings.chain_id_associated_with_another_network',
        ),
      });
    }

    if (
      isChainIdExists &&
      isNetworkExists.length === 0 &&
      isNetworkUiRedesignEnabled() &&
      !editable
    ) {
      return this.setState({
        validateChainId: true,
        warningChainId: strings('app_settings.network_already_exist'),
      });
    }

    if (!chainId) {
      return this.setState({
        warningChainId: strings('app_settings.chain_id_required'),
        validatedChainId: true,
      });
    }

    let errorMessage = '';

    // Check if it's a valid chainId format
    if (chainId.startsWith('0x')) {
      if (!regex.validChainIdHex.test(chainId)) {
        errorMessage = strings('app_settings.invalid_hex_number');
      } else if (!isPrefixedFormattedHexString(chainId)) {
        errorMessage = strings('app_settings.invalid_hex_number_leading_zeros');
      }
    } else if (!regex.validChainId.test(chainId)) {
      errorMessage = strings('app_settings.invalid_number');
    } else if (chainId.startsWith('0')) {
      errorMessage = strings('app_settings.invalid_number_leading_zeros');
    }

    if (errorMessage) {
      return this.setState({
        warningChainId: errorMessage,
        validatedChainId: true,
      });
    }

    // Check if it's a valid chainId number
    if (!isSafeChainId(toHex(chainId))) {
      return this.setState({
        warningChainId: strings('app_settings.invalid_number_range', {
          maxSafeChainId: AppConstants.MAX_SAFE_CHAIN_ID,
        }),
        validatedChainId: true,
      });
    }

    let endpointChainId;
    let providerError;
    try {
      endpointChainId = await jsonRpcRequest(
        this.templateInfuraRpc(rpcUrl),
        'eth_chainId',
      );
    } catch (err) {
      Logger.error(err, 'Failed to fetch the chainId from the endpoint.');
      providerError = err;
    }

    if (
      (providerError || typeof endpointChainId !== 'string') &&
      isNetworkUiRedesignEnabled()
    ) {
      return this.setState({
        validatedRpcURL: false,
        warningRpcUrl: strings('app_settings.unMatched_chain'),
      });
    }

    if (endpointChainId !== toHex(chainId)) {
      if (isNetworkUiRedesignEnabled()) {
        return this.setState({
          warningRpcUrl: strings(
            'app_settings.url_associated_to_another_chain_id',
          ),
          validatedRpcURL: false,
          warningChainId: strings('app_settings.unMatched_chain_name'),
        });
      }
    }

    this.validateRpcAndChainId();
    this.setState({ warningChainId: undefined, validatedChainId: true });
  };

  /**
   * Validates that symbol match with the chainId, setting a warningSymbol if is invalid
   */
  validateSymbol = (chainToMatch = null) => {
    const { ticker, networkList } = this.state;

    const { useSafeChainsListValidation } = this.props;

    if (!useSafeChainsListValidation) {
      return;
    }

    const symbol = chainToMatch
      ? chainToMatch?.nativeCurrency?.symbol ?? null
      : networkList?.nativeCurrency?.symbol ?? null;

    const symbolToUse =
      symbol?.toLowerCase() === ticker?.toLowerCase() ? undefined : symbol;

    return this.setState({
      warningSymbol: ticker && ticker !== symbolToUse ? symbolToUse : undefined,
      validatedSymbol: !!ticker,
    });
  };

  /**
   * Validates that name match with the chainId, setting a warningName if is invalid
   */
  validateName = (chainToMatch = null) => {
    const { nickname, networkList, chainId } = this.state;
    const { useSafeChainsListValidation } = this.props;
    const { MAINNET, LINEA_MAINNET } = CHAIN_IDS;
    const MAINNET_NAME = 'Mainnet';
    const LINEA_NAME = 'Linea Mainnet';

    if (!useSafeChainsListValidation) {
      return;
    }

    // Get the name either from chainToMatch or networkList
    const name = chainToMatch?.name || networkList?.name || null;

    let nameToUse;

    // Determine nameToUse based on chainId and nickname comparison
    if (chainId === MAINNET) {
      // Allow 'Mainnet' or nickname for Ethereum Mainnet
      nameToUse =
        // eslint-disable-next-line eqeqeq
        name === nickname || nickname == MAINNET_NAME ? undefined : name;
    } else if (chainId === LINEA_MAINNET) {
      // Allow 'Linea Mainnet' or nickname for Linea Mainnet
      nameToUse =
        // eslint-disable-next-line eqeqeq
        name === nickname || nickname == LINEA_NAME ? undefined : name;
    } else {
      // For other chains, check if name matches the nickname
      nameToUse = name === nickname ? undefined : name;
    }

    // Update state with warningName
    this.setState({
      warningName: nameToUse,
    });
  };

  /**
   * Allows to identify if any element of the form changed, in order to enable add or save button
   */
  getCurrentState = () => {
    const {
      rpcUrl,
      blockExplorerUrl,
      nickname,
      chainId,
      ticker,
      editable,
      rpcUrls,
      initialState,
    } = this.state;
    const actualState =
      rpcUrl +
      blockExplorerUrl +
      nickname +
      chainId +
      ticker +
      editable +
      rpcUrls;

    let enableAction;
    // If concstenation of parameters changed, user changed something so we are going to enable the action button
    if (actualState !== initialState) {
      enableAction = true;
    } else {
      enableAction = false;
    }
    this.setState({ enableAction });
  };

  /**
   * Returns if action button should be disabled because of the rpc url
   * Chain ID set but, chain id has not been validated yet or there is a warning for chain id
   */
  disabledByChainId = () => {
    const { chainId, validatedChainId, warningChainId } = this.state;

    if (isNetworkUiRedesignEnabled()) {
      return (
        !chainId ||
        (chainId && (!validatedChainId || warningChainId !== undefined))
      );
    }
    if (!chainId) return true;
    return validatedChainId && !!warningChainId;
  };

  /**
   * Returns if action button should be disabled because of the symbol field
   * Symbol field represents the ticker and needs to be set
   */
  disabledBySymbol = () => {
    const { ticker } = this.state;
    if (!ticker) {
      return true;
    }
    return false;
  };

  onRpcUrlAdd = async (url) => {
    await this.setState({
      rpcUrlForm: url,
      validatedRpcURL: false,
      warningRpcUrl: undefined,
      warningChainId: undefined,
      warningSymbol: undefined,
      warningName: undefined,
    });
    this.validateRpcUrl(this.state.rpcUrlForm);
  };

  onRpcNameAdd = async (name) => {
    await this.setState({
      rpcNameForm: name,
    });
  };

  onRpcItemAdd = async (url, name) => {
    if (!url) {
      return;
    }

    const rpcName = name ?? '';

    await this.setState((prevState) => ({
      rpcUrls: [
        ...prevState.rpcUrls,
        { url, name: rpcName, type: RpcEndpointType.Custom },
      ],
    }));

    await this.setState({
      rpcUrl: url,
      rpcName: name,
    });

    this.closeAddRpcForm();
    this.closeRpcModal();
    this.getCurrentState();
  };

  onBlockExplorerItemAdd = async (url) => {
    // If URL is empty or undefined, return early
    if (!url) {
      return;
    }

    // Check if the URL already exists in blockExplorerUrls
    const { blockExplorerUrls } = this.state;
    const urlExists = blockExplorerUrls.includes(url);

    if (urlExists) {
      // If the URL already exists, return early
      return;
    }

    // If the URL doesn't exist, proceed with adding it
    await this.setState((prevState) => ({
      blockExplorerUrls: [...prevState.blockExplorerUrls, url],
    }));

    await this.setState({
      blockExplorerUrl: url,
    });

    this.closeAddBlockExplorerRpcForm();
    this.closeBlockExplorerModal();
    this.getCurrentState();
  };

  onRpcUrlChange = async (url) => {
    const { addMode } = this.state;
    await this.setState({
      rpcUrl: url,
      validatedRpcURL: false,
      warningRpcUrl: undefined,
      warningChainId: undefined,
      warningSymbol: undefined,
      warningName: undefined,
    });

    this.validateName();
    if (addMode) {
      this.validateChainId();
    }
    this.validateSymbol();
    this.getCurrentState();
  };

  onRpcUrlChangeWithName = async (url, name, type) => {
    const nameToUse = name ?? type;
    const { addMode } = this.state;
    await this.setState({
      rpcUrl: url,
      validatedRpcURL: false,
      warningRpcUrl: undefined,
      warningChainId: undefined,
      warningSymbol: undefined,
      warningName: undefined,
    });

    await this.setState({
      rpcName: nameToUse,
    });

    this.validateName();
    if (addMode) {
      this.validateChainId();
    }
    this.validateSymbol();
    this.getCurrentState();
  };

  onBlockExplorerUrlChange = async (url) => {
    const { addMode } = this.state;
    await this.setState({
      blockExplorerUrlForm: url,
      blockExplorerUrl: url,
    });

    this.validateName();
    if (addMode) {
      this.validateChainId();
    }
    this.validateSymbol();
    this.getCurrentState();
  };

  onRpcUrlDelete = async (url) => {
    const { addMode } = this.state;
    await this.setState((prevState) => ({
      rpcUrls: prevState.rpcUrls.filter((rpcUrl) => rpcUrl.url !== url),
    }));
    this.validateName();
    if (addMode) {
      this.validateChainId();
    }
    this.validateSymbol();
    this.getCurrentState();
  };

  onBlockExplorerUrlDelete = async (url) => {
    const { addMode } = this.state;
    await this.setState((prevState) => ({
      blockExplorerUrls: prevState.blockExplorerUrls.filter(
        (explorerUrl) => explorerUrl !== url,
      ),
    }));
    this.validateName();
    if (addMode) {
      this.validateChainId();
    }
    this.validateSymbol();
    this.getCurrentState();
  };

  onNicknameChange = async (nickname) => {
    await this.setState({ nickname });
    this.getCurrentState();
  };

  // this function will autofill the name field with the value in parameter
  autoFillNameField = (nickName) => {
    this.onNicknameChange(nickName);
    this.setState({
      warningName: undefined,
    });
  };

  onChainIDChange = async (chainId) => {
    await this.setState({ chainId, validatedChainId: false });
    this.getCurrentState();
  };

  onTickerChange = async (ticker) => {
    await this.setState({ ticker, validatedSymbol: false });
    this.getCurrentState();
  };

  // this function will autofill the symbol field with the value in parameter
  autoFillSymbolField = (ticker) => {
    this.onTickerChange(ticker);
    this.setState({
      warningSymbol: undefined,
    });
  };

  onNameFocused = () => {
    this.setState({ isNameFieldFocused: true });
  };

  onNameBlur = () => {
    this.setState({ isNameFieldFocused: false });
  };

  onSymbolFocused = () => {
    this.setState({ isSymbolFieldFocused: true });
  };

  onSymbolBlur = () => {
    this.setState({ isSymbolFieldFocused: false });
  };

  onRpcUrlFocused = () => {
    this.setState({ isRpcUrlFieldFocused: true });
  };

  onRpcUrlBlur = () => {
    this.setState({ isRpcUrlFieldFocused: false });
  };

  onChainIdFocused = () => {
    this.setState({ isChainIdFieldFocused: true });
  };

  onChainIdBlur = () => {
    this.setState({ isChainIdFieldFocused: false });
  };

  jumpToRpcURL = () => {
    const { current } = this.inputRpcURL;
    current && current.focus();
  };
  jumpToChainId = () => {
    const { current } = this.inputChainId;
    current && current.focus();
  };
  jumpToSymbol = () => {
    const { current } = this.inputSymbol;
    current && current.focus();
  };
  jumpBlockExplorerURL = () => {
    const { current } = this.inputBlockExplorerURL;
    current && current.focus();
  };

  openAddRpcForm = () => {
    this.setState({ showAddRpcForm: { isVisible: true } });
  };

  closeAddRpcForm = () => {
    this.setState({
      showAddRpcForm: { isVisible: false },
      warningRpcUrl: undefined,
    });
  };

  openAddBlockExplorerForm = () => {
    this.setState({ showAddBlockExplorerForm: { isVisible: true } });
  };

  closeAddBlockExplorerRpcForm = () => {
    this.setState({
      showAddBlockExplorerForm: { isVisible: false },
      blockExplorerUrlForm: undefined,
    });
  };

  closeRpcModal = () => {
    this.setState({
      showMultiRpcAddModal: { isVisible: false },
      rpcUrlForm: '',
      rpcNameForm: '',
    });
  };

  openRpcModal = () => {
    this.setState({ showMultiRpcAddModal: { isVisible: true } });
  };

  openBlockExplorerModal = () => {
    this.setState({ showMultiBlockExplorerAddModal: { isVisible: true } });
  };

  closeBlockExplorerModal = () => {
    this.setState({ showMultiBlockExplorerAddModal: { isVisible: false } });
  };

  switchToMainnet = () => {
    const { NetworkController } = Engine.context;
    const { networkConfigurations } = this.props;

    const { networkClientId } =
      networkConfigurations?.rpcEndpoints?.[
      networkConfigurations.defaultRpcEndpointIndex
      ] ?? {};

    NetworkController.setActiveNetwork(networkClientId);

    setTimeout(async () => {
      await updateIncomingTransactions([CHAIN_IDS.MAINNET]);
    }, 1000);
  };

  removeRpcUrl = () => {
    const { navigation, networkConfigurations, providerConfig } = this.props;
    const { rpcUrl } = this.state;
    if (
      compareSanitizedUrl(rpcUrl, providerConfig.rpcUrl) &&
      providerConfig.type === RPC
    ) {
      this.switchToMainnet();
    }

    const entry = Object.entries(networkConfigurations).find(
      ([, networkConfiguration]) =>
        networkConfiguration.rpcEndpoints[
          networkConfiguration.defaultRpcEndpointIndex
        ].url === rpcUrl,
    );

    if (!entry) {
      throw new Error(`Unable to find network with RPC URL ${rpcUrl}`);
    }
    const [, networkConfiguration] = entry;
    const { NetworkController } = Engine.context;
    NetworkController.removeNetwork(networkConfiguration.chainId);
    navigation.goBack();
  };

  goToNetworkEdit = () => {
    const { rpcUrl } = this.state;
    const { navigation } = this.props;
    navigation.goBack();
    navigation.navigate(Routes.EDIT_NETWORK, {
      network: rpcUrl,
      shouldNetworkSwitchPopToWallet: false,
      shouldShowPopularNetworks: false,
    });
  };

  showNetworkModal = (networkConfiguration) => {
    this.setState({
      showPopularNetworkModal: true,
      popularNetwork: {
        ...networkConfiguration,
        formattedRpcUrl: networkConfiguration.warning
          ? null
          : hideKeyFromUrl(networkConfiguration.rpcUrl),
      },
    });
  };

  customNetwork = () => {
    const {
      rpcUrl,
      rpcUrls,
      blockExplorerUrls,
      blockExplorerUrl,
      nickname,
      chainId,
      ticker,
      editable,
      addMode,
      warningRpcUrl,
      warningChainId,
      warningSymbol,
      warningName,
      enableAction,
      inputWidth,
      isNameFieldFocused,
      isSymbolFieldFocused,
      isRpcUrlFieldFocused,
      isChainIdFieldFocused,
      showMultiRpcAddModal,
      showMultiBlockExplorerAddModal,
      showAddRpcForm,
      showAddBlockExplorerForm,
      rpcUrlForm,
      rpcNameForm,
      rpcName,
      blockExplorerUrlForm,
    } = this.state;
    const { route, networkConfigurations } = this.props;
    const isCustomMainnet = route.params?.isCustomMainnet;
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance =
      this.context.themeAppearance || themeAppearanceLight;
    const styles = createStyles(colors);

    const formatNetworkRpcUrl = (rpcUrl, chainId) => {
      const isNetworkPrePopulated = PopularList.find(
        (val) => val.rpcUrl === rpcUrl && val.chainId === chainId,
      );
      if (isNetworkPrePopulated !== undefined) {
        if (isNetworkPrePopulated.warning) {
          return null;
        }
        return hideKeyFromUrl(isNetworkPrePopulated.rpcUrl);
      }
    };
    const inputStyle = [
      styles.input,
      inputWidth,
      isCustomMainnet ? styles.onboardingInput : undefined,
    ];

    const inputErrorNameStyle = [
      warningName
        ? isNameFieldFocused
          ? styles.inputWithFocus
          : styles.input
        : styles.input,
      inputWidth,
      isCustomMainnet ? styles.onboardingInput : undefined,
    ];

    const inputErrorSymbolStyle = [
      warningSymbol
        ? isSymbolFieldFocused
          ? styles.inputWithFocus
          : styles.inputWithError
        : styles.input,
      inputWidth,
      isCustomMainnet ? styles.onboardingInput : undefined,
    ];

    const inputErrorRpcStyle = [
      warningRpcUrl
        ? isRpcUrlFieldFocused
          ? styles.inputWithFocus
          : styles.inputWithError
        : styles.input,
      inputWidth,
      isCustomMainnet ? styles.onboardingInput : undefined,
    ];

    const inputChainIdStyle = [
      warningChainId
        ? isChainIdFieldFocused
          ? styles.inputWithFocus
          : styles.inputWithError
        : styles.input,
      inputWidth,
      isCustomMainnet ? styles.onboardingInput : undefined,
      !addMode ? styles.onboardingInputDisabled : undefined,
    ];

    const isRPCEditable = isCustomMainnet || editable;
    const isActionDisabled =
      !enableAction || this.disabledByChainId() || this.disabledBySymbol();

    const rpcActionStyle = isActionDisabled
      ? { ...styles.button, ...styles.disabledButton }
      : styles.button;

    const url = new URL(rpcUrl);

    const selectedNetwork = {
      rpcUrl: url.href,
      ticker,
      nickname,
      rpcPrefs: {
        blockExplorerUrl,
      },
    };

    const shouldNetworkSwitchPopToWallet =
      route.params?.shouldNetworkSwitchPopToWallet ?? true;

    const renderWarningChainId = () => {
      const CHAIN_LIST_URL = 'https://chainid.network/';
      const containerStyle = isNetworkUiRedesignEnabled()
        ? styles.newWarningContainer
        : styles.warningContainer;

      if (warningChainId) {
        if (warningChainId === strings('app_settings.unMatched_chain_name')) {
          return (
            <View style={containerStyle}>
              <Text style={styles.warningText}>{warningChainId}</Text>
              <View>
                <Text style={styles.warningText}>
                  {strings('app_settings.find_the_right_one')}{' '}
                  <Text
                    style={styles.link}
                    onPress={() => Linking.openURL(CHAIN_LIST_URL)}
                  >
                    chainid.network{' '}
                    <Icon
                      size={IconSize.Xs}
                      name={IconName.Export}
                      color={IconColor.PrimaryAlternative}
                    />
                  </Text>
                </Text>
              </View>
            </View>
          );
        }
        if (
          warningChainId ===
          strings('app_settings.chain_id_associated_with_another_network')
        ) {
          return (
            <View style={containerStyle}>
              <Text style={styles.warningText}>
                {strings(
                  'app_settings.chain_id_associated_with_another_network',
                )}{' '}
                <Text
                  style={styles.link}
                  onPress={() => this.goToNetworkEdit()}
                >
                  {strings('app_settings.edit_original_network')}
                </Text>
              </Text>
            </View>
          );
        }
        return (
          <View style={containerStyle}>
            <Text style={styles.warningText}>{warningChainId}</Text>
          </View>
        );
      }
      return null;
    };

    const renderWarningSymbol = () => {
      const { validatedSymbol } = this.state;
      if (warningSymbol) {
        if (validatedSymbol) {
          return (
            <View>
              <Text style={styles.inlineWarning}>
                {strings('wallet.suggested_token_symbol')}{' '}
                <Text
                  style={styles.link}
                  onPress={() => {
                    this.autoFillSymbolField(warningSymbol);
                  }}
                >
                  {warningSymbol}
                </Text>
              </Text>
              <Text style={styles.inlineWarningMessage}>
                {strings('wallet.chain_list_returned_different_ticker_symbol')}
              </Text>
            </View>
          );
        }
        return (
          <View>
            <Text style={styles.inlineWarning}>
              {strings('wallet.suggested_token_symbol')}{' '}
              <Text
                style={styles.link}
                onPress={() => {
                  this.autoFillSymbolField(warningSymbol);
                }}
              >
                {warningSymbol}
              </Text>
            </Text>
          </View>
        );
      }
      return null;
    };

    const renderButtons = () => {
      if (isNetworkUiRedesignEnabled()) {
        return (
          <View style={styles.buttonsWrapper}>
            <View style={styles.buttonsContainer}>
              <Button
                size={ButtonSize.Lg}
                variant={ButtonVariants.Primary}
                onPress={this.addRpcUrl}
                testID={NetworksViewSelectorsIDs.ADD_CUSTOM_NETWORK_BUTTON}
                style={styles.button}
                label={strings('app_settings.network_save')}
                isDisabled={isActionDisabled}
                width={ButtonWidthTypes.Full}
              />
            </View>
          </View>
        );
      }
      if (addMode || editable) {
        return (
          <View style={styles.buttonsWrapper}>
            {editable ? (
              <View style={styles.editableButtonsContainer}>
                <Button
                  size={ButtonSize.Lg}
                  variant={ButtonVariants.Secondary}
                  isDanger
                  onPress={this.removeRpcUrl}
                  testID={NetworksViewSelectorsIDs.REMOVE_NETWORK_BUTTON}
                  style={{ ...styles.button, ...styles.cancel }}
                  label={strings('app_settings.delete')}
                />
                <Button
                  size={ButtonSize.Lg}
                  variant={ButtonVariants.Primary}
                  onPress={this.addRpcUrl}
                  testID={NetworksViewSelectorsIDs.ADD_NETWORKS_BUTTON}
                  style={styles.button}
                  label={strings('app_settings.network_save')}
                  isDisabled={isActionDisabled}
                />
              </View>
            ) : (
              <View style={styles.buttonsContainer}>
                <Button
                  size={ButtonSize.Lg}
                  variant={ButtonVariants.Primary}
                  onPress={this.toggleNetworkDetailsModal}
                  testID={NetworksViewSelectorsIDs.ADD_CUSTOM_NETWORK_BUTTON}
                  style={styles.button}
                  label={strings('app_settings.network_add')}
                  isDisabled={isActionDisabled}
                  width={ButtonWidthTypes.Full}
                />
              </View>
            )}
          </View>
        );
      }
      return null;
    };

    return this.state.showNetworkDetailsModal ? (
      <CustomNetwork
        showPopularNetworkModal={this.state.showPopularNetworkModal}
        isNetworkModalVisible={this.state.showNetworkDetailsModal}
        closeNetworkModal={this.toggleNetworkDetailsModal}
        selectedNetwork={{ ...selectedNetwork, chainId: toHex(chainId) }}
        toggleWarningModal={this.toggleWarningModal}
        showNetworkModal={this.showNetworkModal}
        switchTab={this.tabView}
        shouldNetworkSwitchPopToWallet={shouldNetworkSwitchPopToWallet}
      />
    ) : (
      <SafeAreaView
        style={styles.wrapper}
        testID={NetworksViewSelectorsIDs.CONTAINER}
      >
        <KeyboardAwareScrollView style={styles.informationCustomWrapper}>
          <SafeAreaView
            style={
              this.isAnyModalVisible()
                ? styles.scrollWrapperOverlay
                : styles.scrollWrapper
            }
          >
            <Text style={styles.label}>
              {strings('app_settings.network_name_label')}
            </Text>
            <TextInput
              style={inputErrorNameStyle}
              autoCapitalize={'none'}
              autoCorrect={false}
              value={nickname}
              editable={!this.isAnyModalVisible()}
              onChangeText={this.onNicknameChange}
              placeholder={strings('app_settings.network_name_placeholder')}
              placeholderTextColor={colors.text.muted}
              onBlur={() => {
                this.validateName();
                this.onNameBlur();
              }}
              onFocus={this.onNameFocused}
              onSubmitEditing={this.jumpToRpcURL}
              testID={NetworksViewSelectorsIDs.NETWORK_NAME_INPUT}
              keyboardAppearance={themeAppearance}
            />
            {warningName ? (
              <View>
                <Text style={styles.messageWarning}>
                  {strings('wallet.incorrect_network_name_warning')}
                </Text>
                <Text style={styles.inlineWarning}>
                  {strings('wallet.suggested_name')}{' '}
                  <Text
                    style={styles.link}
                    onPress={() => {
                      this.autoFillNameField(warningName);
                    }}
                  >
                    {warningName}
                  </Text>
                </Text>
              </View>
            ) : null}
            <Text style={styles.label}>
              {strings('app_settings.network_rpc_url_label')}
            </Text>
            {isNetworkUiRedesignEnabled() ? (
              <View style={styles.dropDownInput}>
                <Cell
                  key={rpcUrl}
                  testID={NetworksViewSelectorsIDs.ICON_BUTTON_RPC}
                  variant={CellVariant.SelectWithMenu}
                  title={rpcName || rpcUrl}
                  // Conditionally include secondaryText only if rpcName exists
                  {...(rpcName
                    ? {
                      secondaryText:
                        hideKeyFromUrl(rpcUrl) ??
                        hideKeyFromUrl(
                          networkConfigurations?.[chainId]?.rpcEndpoints?.[
                            networkConfigurations?.[chainId]
                              ?.defaultRpcEndpointIndex
                          ]?.url,
                        ),
                    }
                    : {})}
                  isSelected={false}
                  withAvatar={false}
                  onPress={this.openRpcModal}
                  buttonIcon={IconName.ArrowDown}
                  buttonProps={{
                    onButtonClick: () => this.openRpcModal(),
                  }}
                />
              </View>
            ) : (
              <TextInput
                ref={this.inputRpcURL}
                style={inputErrorRpcStyle}
                autoCapitalize={'none'}
                autoCorrect={false}
                value={formatNetworkRpcUrl(rpcUrl, chainId) || rpcUrl}
                editable={isRPCEditable}
                onChangeText={this.onRpcUrlChange}
                onBlur={() => {
                  this.validateRpcUrl(rpcUrl);
                  this.onRpcUrlBlur();
                }}
                onFocus={this.onRpcUrlFocused}
                placeholder={strings('app_settings.network_rpc_placeholder')}
                placeholderTextColor={colors.text.muted}
                onSubmitEditing={this.jumpToChainId}
                testID={NetworksViewSelectorsIDs.RPC_URL_INPUT}
                keyboardAppearance={themeAppearance}
              />
            )}

            {!isNetworkUiRedesignEnabled()
              ? warningRpcUrl && (
                <View
                  style={
                    isNetworkUiRedesignEnabled()
                      ? styles.newWarningContainer
                      : styles.warningContainer
                  }
                  testID={NetworksViewSelectorsIDs.RPC_WARNING_BANNER}
                >
                  <Text style={styles.warningText}>{warningRpcUrl}</Text>
                </View>
              )
              : null}

            <Text style={styles.label}>
              {strings('app_settings.network_chain_id_label')}
            </Text>
            <TextInput
              ref={this.inputChainId}
              style={inputChainIdStyle}
              autoCapitalize={'none'}
              autoCorrect={false}
              value={chainId}
              editable={!this.isAnyModalVisible() && addMode}
              onChangeText={this.onChainIDChange}
              onBlur={() => {
                this.validateChainId();
                this.onChainIdBlur();
              }}
              onFocus={this.onChainIdFocused}
              placeholder={strings('app_settings.network_chain_id_placeholder')}
              placeholderTextColor={colors.text.muted}
              onSubmitEditing={this.jumpToSymbol}
              keyboardType={'numbers-and-punctuation'}
              testID={NetworksViewSelectorsIDs.CHAIN_INPUT}
              keyboardAppearance={themeAppearance}
            />
            {renderWarningChainId()}

            <Text style={styles.label}>
              {strings('app_settings.network_symbol_label')}
            </Text>
            <TextInput
              ref={this.inputSymbol}
              style={inputErrorSymbolStyle}
              autoCapitalize={'none'}
              autoCorrect={false}
              value={ticker}
              editable={!this.isAnyModalVisible()}
              onChangeText={this.onTickerChange}
              onBlur={() => {
                this.validateSymbol();
                this.onSymbolBlur();
              }}
              onFocus={this.onSymbolFocused}
              placeholder={strings('app_settings.network_symbol_label')}
              placeholderTextColor={colors.text.muted}
              onSubmitEditing={this.jumpBlockExplorerURL}
              testID={NetworksViewSelectorsIDs.NETWORKS_SYMBOL_INPUT}
              keyboardAppearance={themeAppearance}
            />
            {renderWarningSymbol()}

            <Text style={styles.label}>
              {strings('app_settings.network_block_explorer_label')}
            </Text>

            {isNetworkUiRedesignEnabled() ? (
              <View style={styles.dropDownInput}>
                <Cell
                  key={rpcUrl}
                  testID={NetworksViewSelectorsIDs.ICON_BUTTON_BLOCK_EXPLORER}
                  variant={CellVariant.SelectWithMenu}
                  title={blockExplorerUrl}
                  isSelected={false}
                  withAvatar={false}
                  onPress={this.openBlockExplorerModal}
                  buttonIcon={IconName.ArrowDown}
                  buttonProps={{
                    onButtonClick: () => this.openBlockExplorerModal(),
                  }}
                  avatarProps={{
                    variant: AvatarVariant.Network,
                  }}
                />
              </View>
            ) : (
              <TextInput
                ref={this.inputBlockExplorerURL}
                style={inputStyle}
                autoCapitalize={'none'}
                autoCorrect={false}
                value={blockExplorerUrl}
                onChangeText={this.onBlockExplorerUrlChange}
                placeholder={strings(
                  'app_settings.network_block_explorer_placeholder',
                )}
                testID={NetworksViewSelectorsIDs.BLOCK_EXPLORER_INPUT}
                placeholderTextColor={colors.text.muted}
                onSubmitEditing={this.toggleNetworkDetailsModal}
                keyboardAppearance={themeAppearance}
              />
            )}
          </SafeAreaView>
          <View style={styles.bottomSection}>
            {isCustomMainnet ? (
              <Button
                variant={ButtonVariants.Primary}
                onPress={this.addRpcUrl}
                style={rpcActionStyle}
                label={strings('app_settings.networks_default_cta')}
                size={ButtonSize.Lg}
                disabled={isActionDisabled}
                width={ButtonWidthTypes.Full}
                testID={CustomDefaultNetworkIDs.USE_THIS_NETWORK_BUTTON_ID}
              />
            ) : (
              renderButtons()
            )}
          </View>
        </KeyboardAwareScrollView>

        {isNetworkUiRedesignEnabled() && showAddRpcForm.isVisible ? (
          <ReusableModal
            style={styles.sheetRpcForm}
            onDismiss={this.closeAddRpcForm}
            shouldGoBack={false}
          >
            <View style={styles.notch} />
            <BottomSheetHeader
              onBack={() => {
                this.closeAddRpcForm();
                this.openRpcModal();
              }}
              style={styles.baseAll}
            >
              <Text style={styles.heading}>
                {strings('app_settings.add_rpc_url')}
              </Text>
            </BottomSheetHeader>
            <KeyboardAwareScrollView
              style={styles.sheetContent}
              enableOnAndroid
              keyboardShouldPersistTaps="handled"
            >
              <SafeAreaView style={styles.rpcMenu}>
                <Text style={styles.label}>
                  {strings('app_settings.network_rpc_url_label')}
                </Text>
                <TextInput
                  ref={this.inputRpcURL}
                  style={inputErrorRpcStyle}
                  value={rpcUrlForm}
                  autoCapitalize={'none'}
                  autoCorrect={false}
                  onChangeText={this.onRpcUrlAdd}
                  onFocus={this.onRpcUrlFocused}
                  placeholder={strings('app_settings.network_rpc_placeholder')}
                  placeholderTextColor={colors.text.muted}
                  onSubmitEditing={this.jumpToChainId}
                  testID={NetworksViewSelectorsIDs.RPC_URL_INPUT}
                  keyboardAppearance={themeAppearance}
                />
                {warningRpcUrl && (
                  <View testID={NetworksViewSelectorsIDs.RPC_WARNING_BANNER}>
                    <Text style={styles.warningText}>{warningRpcUrl}</Text>
                  </View>
                )}
                <Text style={styles.label}>
                  {strings('app_settings.network_rpc_name_label')}
                </Text>
                <TextInput
                  ref={this.inputNameRpcURL}
                  style={inputErrorRpcStyle}
                  autoCapitalize={'none'}
                  value={rpcNameForm}
                  autoCorrect={false}
                  onChangeText={this.onRpcNameAdd}
                  placeholder={strings('app_settings.network_rpc_placeholder')}
                  placeholderTextColor={colors.text.muted}
                  onSubmitEditing={this.jumpToChainId}
                  testID={NetworksViewSelectorsIDs.RPC_NAME_INPUT}
                  keyboardAppearance={themeAppearance}
                />
                <View style={styles.addRpcNameButton}>
                  <ButtonPrimary
                    label={strings('app_settings.add_rpc_url')}
                    size={ButtonSize.Lg}
                    onPress={() => {
                      this.onRpcItemAdd(rpcUrlForm, rpcNameForm);
                    }}
                    width={ButtonWidthTypes.Auto}
                    labelTextVariant={TextVariant.DisplayMD}
                    isDisabled={!!warningRpcUrl}
                    testID={NetworksViewSelectorsIDs.ADD_RPC_BUTTON}
                  />
                </View>
              </SafeAreaView>
            </KeyboardAwareScrollView>
          </ReusableModal>
        ) : null}
        {isNetworkUiRedesignEnabled() && showAddBlockExplorerForm.isVisible ? (
          <ReusableModal
            style={styles.sheetRpcForm}
            shouldGoBack={false}
            onDismiss={this.closeAddBlockExplorerRpcForm}
          >
            <View style={styles.notch} />
            <BottomSheetHeader
              onBack={() => {
                this.closeAddBlockExplorerRpcForm();
                this.openBlockExplorerModal();
              }}
              style={styles.baseAll}
            >
              <Text style={styles.heading}>
                {strings('app_settings.add_block_explorer_url')}
              </Text>
            </BottomSheetHeader>
            <KeyboardAwareScrollView
              style={styles.sheetContent}
              enableOnAndroid
              keyboardShouldPersistTaps="handled"
            >
              <SafeAreaView style={styles.rpcMenu}>
                <Text style={styles.label}>
                  {strings('app_settings.network_block_explorer_label')}
                </Text>
                <TextInput
                  ref={this.inputBlockExplorerURL}
                  style={inputStyle}
                  autoCapitalize={'none'}
                  value={blockExplorerUrlForm}
                  autoCorrect={false}
                  onChangeText={this.onBlockExplorerUrlChange}
                  placeholder={strings(
                    'app_settings.network_block_explorer_placeholder',
                  )}
                  testID={NetworksViewSelectorsIDs.BLOCK_EXPLORER_INPUT}
                  placeholderTextColor={colors.text.muted}
                  onSubmitEditing={() => {
                    this.onBlockExplorerItemAdd(blockExplorerUrlForm);
                  }}
                  keyboardAppearance={themeAppearance}
                />
                {blockExplorerUrl &&
                  (!isUrl(blockExplorerUrl) ||
                    blockExplorerUrls.includes(blockExplorerUrlForm)) && (
                    <Text style={styles.warningText}>
                      {strings('app_settings.invalid_block_explorer_url')}
                    </Text>
                  )}

                <View style={styles.addRpcNameButton}>
                  <ButtonPrimary
                    label={strings('app_settings.add_block_explorer_url')}
                    testID={NetworksViewSelectorsIDs.ADD_BLOCK_EXPLORER}
                    size={ButtonSize.Lg}
                    onPress={() => {
                      this.onBlockExplorerItemAdd(blockExplorerUrlForm);
                    }}
                    width={ButtonWidthTypes.Full}
                    labelTextVariant={TextVariant.DisplayMD}
                    isDisabled={
                      !blockExplorerUrl ||
                      !blockExplorerUrlForm ||
                      !isUrl(blockExplorerUrl)
                    }
                  />
                </View>
              </SafeAreaView>
            </KeyboardAwareScrollView>
          </ReusableModal>
        ) : null}

        {isNetworkUiRedesignEnabled() &&
          showMultiBlockExplorerAddModal.isVisible ? (
          <ReusableModal
            style={
              blockExplorerUrls.length > 0 ? styles.sheet : styles.sheetSmall
            }
            onDismiss={this.closeBlockExplorerModal}
            shouldGoBack={false}
          >
            {/* Sticky Notch */}
            <View style={styles.notch} />
            <View style={styles.container}>
              {/* Sticky Header */}
              <BottomSheetHeader>
                <Text style={styles.heading}>
                  {strings('app_settings.add_block_explorer_url')}
                </Text>
              </BottomSheetHeader>

              {/* Scrollable Middle Content */}
              <ScrollView contentContainerStyle={styles.scrollViewContent}>
                {blockExplorerUrls.length > 0 ? (
                  <View>
                    {blockExplorerUrls.map((url) => (
                      <Cell
                        key={url}
                        variant={CellVariant.SelectWithMenu}
                        title={url}
                        isSelected={blockExplorerUrl === url}
                        withAvatar={false}
                        onPress={async () => {
                          await this.onBlockExplorerUrlChange(url);
                          this.closeBlockExplorerModal();
                        }}
                        showButtonIcon={blockExplorerUrl !== url}
                        buttonIcon={IconName.Trash}
                        buttonProps={{
                          onButtonClick: () => {
                            this.onBlockExplorerUrlDelete(url);
                          },
                        }}
                        avatarProps={{
                          variant: AvatarVariant.Network,
                        }}
                      />
                    ))}
                  </View>
                ) : null}

                {/* Add Block Explorer Button */}
                <View style={styles.scrollableBox}>
                  <ButtonLink
                    label={strings('app_settings.add_block_explorer_url')}
                    endIconName={IconName.Add}
                    size={ButtonSize.Lg}
                    onPress={() => {
                      this.openAddBlockExplorerForm();
                      this.closeBlockExplorerModal();
                    }}
                    testID={NetworksViewSelectorsIDs.ADD_BLOCK_EXPLORER}
                    width={ButtonWidthTypes.Auto}
                    labelTextVariant={TextVariant.DisplayMD}
                  />
                </View>
              </ScrollView>
            </View>
          </ReusableModal>
        ) : null}

        {isNetworkUiRedesignEnabled() && showMultiRpcAddModal.isVisible ? (
          <ReusableModal
            style={rpcUrls.length > 0 ? styles.sheet : styles.sheetSmall}
            onDismiss={this.closeRpcModal}
            shouldGoBack={false}
          >
            <View style={styles.notch} />
            <View style={styles.container}>
              {/* Sticky Header */}
              <BottomSheetHeader>
                <Text style={styles.heading}>
                  {strings('app_settings.add_rpc_url')}
                </Text>
              </BottomSheetHeader>

              {/* Scrollable Middle Content */}
              <ScrollView contentContainerStyle={styles.scrollViewContent}>
                {rpcUrls.length > 0 ? (
                  <View>
                    {rpcUrls.map(({ url, name, type }) => (
                      <Cell
                        key={`${url}-${name}`}
                        variant={CellVariant.SelectWithMenu}
                        title={name || type}
                        secondaryText={hideKeyFromUrl(url)}
                        isSelected={rpcUrl === url}
                        withAvatar={false}
                        onPress={async () => {
                          await this.onRpcUrlChangeWithName(url, name, type);
                          this.closeRpcModal();
                        }}
                        showButtonIcon={
                          rpcUrl !== url && type !== RpcEndpointType.Infura
                        }
                        buttonIcon={IconName.Trash}
                        buttonProps={{
                          onButtonClick: () => {
                            this.onRpcUrlDelete(url);
                          },
                        }}
                        onTextClick={async () => {
                          await this.onRpcUrlChangeWithName(url, name, type);
                          this.closeRpcModal();
                        }}
                        avatarProps={{
                          variant: AvatarVariant.Token,
                        }}
                      />
                    ))}
                  </View>
                ) : null}
                <View style={styles.scrollableBox}>
                  <ButtonLink
                    label={strings('app_settings.add_rpc_url')}
                    endIconName={IconName.Add}
                    size={ButtonSize.Lg}
                    onPress={() => {
                      this.openAddRpcForm();
                      this.closeRpcModal();
                    }}
                    width={ButtonWidthTypes.Auto}
                    labelTextVariant={TextVariant.DisplayMD}
                    testID={NetworksViewSelectorsIDs.ADD_RPC_BUTTON}
                  />
                </View>
              </ScrollView>
            </View>
          </ReusableModal>
        ) : null}
      </SafeAreaView>
    );
  };

  onCancel = () =>
    this.setState({ showPopularNetworkModal: false, popularNetwork: {} });

  toggleWarningModal = () =>
    this.setState({ showWarningModal: !this.state.showWarningModal });

  toggleNetworkDetailsModal = async () => {
    const { rpcUrl, chainId: stateChainId } = this.state;
    const { navigation } = this.props;
    const formChainId = stateChainId.trim().toLowerCase();

    // Ensure chainId is a 0x-prefixed, lowercase hex string
    let chainId = formChainId;
    if (!chainId.startsWith('0x')) {
      chainId = `0x${parseInt(chainId, 10).toString(16)}`;
    }

    // if chainId is goerli, show deprecation modal
    if (chainId === CHAIN_IDS.GOERLI) {
      navigation.navigate(Routes.DEPRECATED_NETWORK_DETAILS);
      return;
    }

    if (!(await this.validateChainIdOnSubmit(formChainId, chainId, rpcUrl))) {
      return;
    }
    this.setState({
      showNetworkDetailsModal: !this.state.showNetworkDetailsModal,
    });
  };

  goToLearnMore = () => Linking.openURL(strings('networks.learn_more_url'));

  renderTabBar = (props) => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    return (
      <View style={styles.base}>
        <DefaultTabBar
          underlineStyle={styles.tabUnderlineStyle}
          activeTextColor={colors.primary.default}
          inactiveTextColor={colors.text.muted}
          backgroundColor={colors.background.default}
          tabStyle={styles.tabStyle}
          tabPadding={16}
          textStyle={styles.textStyle}
          {...props}
        />
      </View>
    );
  };

  render() {
    const { route } = this.props;
    const networkTypeOrRpcUrl = route.params?.network;
    const shouldNetworkSwitchPopToWallet =
      route.params?.shouldNetworkSwitchPopToWallet ?? true;
    const shouldShowPopularNetworks =
      route.params?.shouldShowPopularNetworks ?? true;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <SafeAreaView
        style={styles.wrapper}
        testID={NetworksViewSelectorsIDs.CONTAINER}
      >
        <View style={styles.informationWrapper}>
          {(isNetworkUiRedesignEnabled() && !shouldShowPopularNetworks) ||
            networkTypeOrRpcUrl ? (
            this.customNetwork()
          ) : (
            <ScrollableTabView
              tabBarTextStyle={styles.tabLabelStyle}
              renderTabBar={this.renderTabBar}
              ref={(tabView) => {
                this.tabView = tabView;
              }}
            >
              <View
                tabLabel={strings('app_settings.popular')}
                key={AppConstants.ADD_CUSTOM_NETWORK_POPULAR_TAB_ID}
                style={styles.networksWrapper}
                testID={NetworksViewSelectorsIDs.POPULAR_NETWORKS_CONTAINER}
              >
                <CustomNetwork
                  showPopularNetworkModal={this.state.showPopularNetworkModal}
                  isNetworkModalVisible={this.state.showPopularNetworkModal}
                  closeNetworkModal={this.onCancel}
                  selectedNetwork={this.state.popularNetwork}
                  toggleWarningModal={this.toggleWarningModal}
                  showNetworkModal={this.showNetworkModal}
                  switchTab={this.tabView}
                  shouldNetworkSwitchPopToWallet={
                    shouldNetworkSwitchPopToWallet
                  }
                />
              </View>

              <View
                tabLabel={strings('app_settings.custom_network_name')}
                key={AppConstants.ADD_CUSTOM_NETWORK_CUSTOM_TAB_ID}
                testID={NetworksViewSelectorsIDs.CUSTOM_NETWORKS_CONTAINER}
              >
                {this.customNetwork()}
              </View>
            </ScrollableTabView>
          )}
        </View>
        {this.state.showWarningModal ? (
          <InfoModal
            isVisible={this.state.showWarningModal}
            title={strings('networks.network_warning_title')}
            body={
              <Text>
                <Text style={styles.desc}>
                  {strings('networks.network_warning_desc')}
                </Text>{' '}
                <Text style={[styles.blueText]} onPress={this.goToLearnMore}>
                  {strings('networks.learn_more')}
                </Text>
              </Text>
            }
            toggleModal={this.toggleWarningModal}
          />
        ) : null}
      </SafeAreaView>
    );
  }
}

NetworkSettings.contextType = ThemeContext;
const mapDispatchToProps = (dispatch) => ({
  showNetworkOnboardingAction: ({
    networkUrl,
    networkType,
    nativeToken,
    showNetworkOnboarding,
  }) =>
    dispatch(
      showNetworkOnboardingAction({
        networkUrl,
        networkType,
        nativeToken,
        showNetworkOnboarding,
      }),
    ),
});

const mapStateToProps = (state) => ({
  providerConfig: selectProviderConfig(state),
  networkConfigurations: selectNetworkConfigurations(state),
  networkOnboardedState: state.networkOnboarded.networkOnboardedState,
  useSafeChainsListValidation: selectUseSafeChainsListValidation(state),
});

export default compose(
  connect(mapStateToProps, mapDispatchToProps),
  withIsOriginalNativeToken,
)(withMetricsAwareness(NetworkSettings));
