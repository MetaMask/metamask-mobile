export interface Props {
	/**
	 * Navigation object
	 */
	navigation: any;
	/**
	 * Object representing the selected the selected network
	 */
	network: any;
	/**
	 * Selected address as string
	 */
	selectedAddress: any;
	/**
	 * List of accounts from the AccountTrackerController
	 */
	accounts: any;
	/**
	 * List of accounts from the PreferencesController
	 */
	identities: any;
	/**
    /* Selected currency
    */
	currentCurrency: any;
	/**
	 * List of keyrings
	 */
	keyrings: any;
	/**
	 * Action that toggles the network modal
	 */
	toggleNetworkModal: any;
	/**
	 * Action that toggles the accounts modal
	 */
	toggleAccountsModal: any;
	/**
	 * Action that toggles the receive modal
	 */
	toggleReceiveModal: any;
	/**
	 * Action that shows the global alert
	 */
	showAlert: any;
	/**
	 * Boolean that determines the status of the networks modal
	 */
	networkModalVisible: any;
	/**
	 * Boolean that determines the status of the receive modal
	 */
	receiveModalVisible: any;
	/**
	 * Start transaction with asset
	 */
	newAssetTransaction: any;
	/**
	 * Boolean that determines the status of the networks modal
	 */
	accountsModalVisible: any;
	/**
	 * Boolean that determines if the user has set a password before
	 */
	passwordSet: any;
	/**
	 * Wizard onboarding state
	 */
	wizard: any;
	/**
	 * Current provider ticker
	 */
	ticker: any;
	/**
	 * Frequent RPC list from PreferencesController
	 */
	frequentRpcList: any;
	/**
	 * Array of ERC20 assets
	 */
	tokens: any;
	/**
	 * Array of ERC721 assets
	 */
	collectibles: any;
	/**
	 * redux flag that indicates if the user
	 * completed the seed phrase backup flow
	 */
	seedphraseBackedUp: any;
	/**
	 * An object containing token balances for current account and network in the format address => balance
	 */
	tokenBalances: any;
	/**
	 * Prompts protect wallet modal
	 */
	protectWalletModalVisible: any;
}
