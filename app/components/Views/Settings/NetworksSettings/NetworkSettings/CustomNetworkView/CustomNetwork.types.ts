import { ImageSourcePropType } from 'react-native';
// eslint-disable-next-line import/no-extraneous-dependencies
import { TabBarProps } from '@tommasini/react-native-scrollable-tab-view';

export interface Network {
  chainId: string;
  nickname: string;
  rpcPrefs: {
    blockExplorerUrl: string;
    imageSource?: ImageSourcePropType;
    imageUrl?: string;
  };
  rpcUrl: string;
  failoverRpcUrls?: string[];
  ticker: string;
  /**
   * Not supported by Infura
   */
  warning?: boolean;
}

export interface ExtendedNetwork extends Network {
  name?: string;
  formattedRpcUrl?: string | null;
}

export interface CustomNetworkProps {
  /**
   * Show list header
   */
  listHeader?: string;
  /**
   * Boolean check to track if Popular network or Custom network form is open
   */
  showPopularNetworkModal: boolean;
  /**
   * is network modal open
   */
  isNetworkModalVisible: boolean;
  /**
   * Close or hide network modal
   */
  closeNetworkModal: () => void;
  /**
   * network to add or switch to
   */
  selectedNetwork?: Network;
  /**
   * show or hide warning modal
   */
  toggleWarningModal?: () => void;
  /**
   * show network modal
   */
  showNetworkModal: (networkConfiguration: Network & ExtendedNetwork) => void;
  /**
   * Switch tab between popular and custom networks
   */
  // TODO - The name for this type is not accurate. It should be a ref of the ScrollableTabView's tab.
  switchTab?: TabBarProps;
  /**
   * should navigation return to wallet after network change
   */
  shouldNetworkSwitchPopToWallet: boolean;
  /**
   * Callback after network change, overrides shouldNetworkSwitchPopToWallet
   */
  onNetworkSwitch?: () => void;
  /**
   * Show added networks
   */
  showAddedNetworks?: boolean;
  /**
   * List of custom networks
   */
  customNetworksList?: Network[];
  /**
   * Display "Continue" for selected networks
   */
  displayContinue?: boolean;
  /**
   * If this list of networks is used in a filtered way for example when the user is using a search box to filter networks,
   * we should take that into consideration before displaying an empty state telling the user he has already added all networks.
   * This is the main use case for this prop.
   */
  showCompletionMessage?: boolean;
  /**
   * In the redesigned network UI, instead of showing warning icons on each network that needs it,
   * instead an information icon will be displayed next to the addtional networks group title.
   * This prop allows to support both the redesigned UI as well as it's previous version.
   * Once the previous version is removed, this hideWarningIcons wont have any other use and can be removed.
   */
  hideWarningIcons?: boolean;
  /**
   * Allow network switch
   */
  allowNetworkSwitch?: boolean;
  /**
   * Use compact UI with icons instead of text
   */
  compactMode?: boolean;
}
