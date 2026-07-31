// Shared test-snaps URL for flows, selectors, and helpers without importing TestSnaps.
export const TEST_SNAPS_URL =
  'https://metamask.github.io/snaps/test-snaps/3.5.2/';

// Only keep selectors that are actually used in tests
export const TestSnapViewSelectorWebIDS = {
  cancelBackgroundEventButton: 'cancelBackgroundEvent',
  clearManageStateButton: 'clearManageState',
  clearStateButton: 'clearState',
  clearStateUnencryptedButton: 'clearStateUnencrypted',
  clearUnencryptedManageStateButton: 'clearUnencryptedManageState',
  connectBackgroundEventsButton: 'connectbackground-events',
  connectBip32Button: 'connectbip32',
  connectBip44Button: 'connectbip44',
  connectCronjobSnapButton: 'connectcronjobs',
  connectClientStatusSnapButton: 'connectclient-status',
  connectDialogSnapButton: 'connectdialogs',
  connectErrorSnapButton: 'connecterrors',
  connectGetEntropyButton: 'connectGetEntropySnap',
  connectGetFileButton: 'connectgetfile',
  connectGetPreferencesButton: 'connectpreferences',
  connectJsonRpcButton: 'connectjson-rpc',
  connectLifeCycleButton: 'connectlifecycle-hooks',
  connectImageButton: 'connectimages',
  connectInteractiveButton: 'connectinteractive-ui',
  connectManageStateButton: 'connectmanage-state',
  connectMultichainProviderButton: 'connectmultichain-provider',
  connectNameLookupButton: 'connectname-lookup',
  connectNetworkAccessButton: 'connectnetwork-access',
  connectEthereumProviderButton: 'connectethereum-provider',
  connectStateButton: 'connectstate',
  connectJsx: 'connectjsx',
  connectWasmButton: 'connectwasm',
  createDialogButton: 'createDialogButton',
  createDialogDisabledButton: 'createDisabledDialogButton',
  displayJsxButton: 'displayJsx',
  getBackgroundEventResultButton: 'getBackgroundEvents',
  getPreferencesButton: 'getPreferences',
  getPublicKeyBip44Button: 'sendBip44Test',
  getPublicKeyBip32Button: 'bip32GetPublic',
  getCompressedPublicKeyBip32Button: 'bip32GetCompressedPublic',
  scheduleBackgroundEventWithDateButton: 'scheduleBackgroundEventWithDate',
  scheduleBackgroundEventWithDurationButton:
    'scheduleBackgroundEventWithDuration',
  signEntropyMessageButton: 'signEntropyMessage',
  signMessageBip32Secp256k1Button: 'sendBip32-secp256k1',
  signMessageBip32ed25519Button: 'sendBip32-ed25519',
  signMessageBip32ed25519Bip32Button: 'sendBip32-ed25519Bip32',
  signMessageBip44Button: 'signBip44Message',
  signMessageMultichainButton: 'signMessageMultichainButton',
  signTypedDataMultichainButton: 'signTypedDataMultichainButton',
  sendAlertButton: 'sendAlertButton',
  sendClientStatusButton: 'sendClientStatusTest',
  sendConfirmationButton: 'sendConfirmationButton',
  sendCustomButton: 'sendCustomButton',
  sendCreateSessionButton: 'sendCreateSession',
  sendErrorButton: 'sendError',
  sendGetFileTextButton: 'sendGetFileTextButton',
  sendGetFileBase64Button: 'sendGetFileBase64Button',
  sendGetFileHexButton: 'sendGetFileHexButton',
  sendGetStateButton: 'sendGetState',
  sendGetUnencryptedStateButton: 'sendGetUnencryptedState',
  sendManageStateButton: 'sendManageState',
  sendMultichainAccountsButton: 'sendMultichainAccounts',
  sendMultichainGetGenesisHashButton: 'sendMultichainGetGenesisHash',
  sendMultichainChainIdButton: 'sendMultichainChainId',
  sendNetworkAccessTestButton: 'sendNetworkAccessTest',
  sendRpcButton: 'sendRpc',
  sendStateButton: 'sendState',
  sendUnencryptedManageStateButton: 'sendUnencryptedManageState',
  sendUnencryptedStateButton: 'sendUnencryptedState',
  startWebSocket: 'startWebSocket',
  stopWebSocket: 'stopWebSocket',
  showSVGImage: 'showSVGImage',
  showPNGImage: 'showPNGImage',
  showPreinstalledDialogButton: 'showPreinstalledDialog',
  getWebSocketState: 'getWebSocketState',
  getChainIdButton: 'sendEthprovider',
  getGenesisHashButton: 'sendGenesisBlockEthProvider',
  getAccountsButton: 'sendEthproviderAccounts',
  personalSignButton: 'signPersonalSignMessage',
  sendWasmMessageButton: 'sendWasmMessage',
  signTypedDataButton: 'signTypedDataButton',
  trackErrorButton: 'trackError',
  trackEventButton: 'trackEvent',
  startTraceButton: 'start-trace',
  endTraceButton: 'end-trace',
  messengerCallButton: 'messenger-call',
};

export const TestSnapInputSelectorWebIDS = {
  backgroundEventDateInput: 'backgroundEventDate',
  backgroundEventDurationInput: 'backgroundEventDuration',
  cancelBackgroundEventInput: 'backgroundEventId',
  dataManageStateInput: 'dataManageState',
  dataStateInput: 'dataState',
  dataUnencryptedManageStateInput: 'dataUnencryptedManageState',
  dataUnencryptedStateInput: 'dataUnencryptedState',
  entropyMessageInput: 'entropyMessage',
  getStateInput: 'getState',
  getUnencryptedStateInput: 'getUnencryptedState',
  messageBip44Input: 'bip44Message',
  messageEd25519Bip32Input: 'bip32Message-ed25519Bip32',
  messageEd25519Input: 'bip32Message-ed25519',
  messageSecp256k1Input: 'bip32Message-secp256k1',
  setStateKeyInput: 'setStateKey',
  setStateKeyUnencryptedInput: 'setStateKeyUnencrypted',
  webSocketUrlInput: 'webSocketUrl',
  personalSignMessageInput: 'personalSignMessage',
  signMessageMultichainMessageInput: 'signMessageMultichain',
  signTypedDataMessageInput: 'signTypedData',
  signTypedDataMultichainMessageInput: 'signTypedDataMultichain',
  wasmInput: 'wasmInput',
};

export const EntropyDropDownSelectorWebIDS = {
  bip32EntropyDropDown: 'bip32-entropy-selector',
  bip44EntropyDropDown: 'bip44-entropy-selector',
  getEntropyDropDown: 'get-entropy-entropy-selector',
  networkDropDown: 'select-chain',
  multichainNetworkDropdown: 'select-multichain-chain',
};

/** Native Snap UI renderer element IDs used outside web dropdown option maps. */
export const SnapUIRendererSelectorIDs = {
  selectorItem: 'snap-ui-renderer__selector-item',
  scrollView: 'snap-ui-renderer__scrollview',
  dropdown: 'snap-ui-renderer__dropdown',
  selector: 'snap-ui-renderer__selector',
  checkbox: 'snap-ui-renderer__checkbox',
  radio: 'snap-ui-renderer__radio',
  radioButton: 'snap-ui-renderer__radio-button',
  dateTimeTouchable: 'snap-ui-renderer__date-time-picker--datetime-touchable',
  dateTouchable: 'snap-ui-renderer__date-time-picker--date-touchable',
  timeTouchable: 'snap-ui-renderer__date-time-picker--time-touchable',
  dateTimeInput: 'snap-ui-renderer__date-time-picker--datetime-input',
  dateInput: 'snap-ui-renderer__date-time-picker--date-input',
  timeInput: 'snap-ui-renderer__date-time-picker--time-input',
};

/** Android: read-only date/time inputs (touchables often vanish when disabled). */
export const SNAP_UI_DATE_PICKER_INPUT_IDS = [
  SnapUIRendererSelectorIDs.dateTimeInput,
  SnapUIRendererSelectorIDs.dateInput,
  SnapUIRendererSelectorIDs.timeInput,
] as const;

export const NativeDropdownSelectorWebIDS = {
  snapUISelector: SnapUIRendererSelectorIDs.selector,
  snapUIDropdown: SnapUIRendererSelectorIDs.dropdown,
};

/** Native Snap UI dialog custom input (Detox / Android Appium testID). */
export const SnapUIInputSelectorIDs = {
  customDialogInput: 'custom-input-snap-ui-input',
};

/** iOS: XCUITest often omits `*-snap-ui-input`; use scrollview textfield instead. */
export const SnapUIInputSelectorXPaths = {
  textfieldIos:
    '//*[@name="snap-ui-renderer__scrollview"]//*[@name="textfield"]',
};

/** iOS Appium XPath by testID/`name` (nodes may be accessible=false / visible=false). */
export function snapUiNativeIosXPath(testID: string): string {
  return `//*[@name="${testID}"]`;
}

/**
 * JSX Snap count — scoped under the Snap UI scrollview so bare "0"/"1" cannot
 * match unrelated wallet chrome (especially on Android contains-text matchers).
 *
 * iOS: count StaticTexts are accessible=false; the SnapUI card parent exposes
 * label "Hover for explanation, Count, N, Increment".
 */
export function snapUIJsxCountIosXPath(count: string): string {
  const scrollView = SnapUIRendererSelectorIDs.scrollView;
  return `//*[@name="${scrollView}"]//*[@accessible="true" and contains(@label,"Count, ${count}")]`;
}

export function snapUIJsxCountAndroidXPath(count: string): string {
  const scrollView = SnapUIRendererSelectorIDs.scrollView;
  return `//*[contains(@resource-id,"${scrollView}")]//*[@text="${count}" or @content-desc="${count}" or contains(@content-desc,"Count, ${count}")]`;
}

export function snapUIJsxIncrementIosXPath(): string {
  const scrollView = SnapUIRendererSelectorIDs.scrollView;
  return `//*[@name="${scrollView}"]//*[@name="Increment"]`;
}

export function snapUIJsxIncrementAndroidXPath(): string {
  const scrollView = SnapUIRendererSelectorIDs.scrollView;
  return `//*[contains(@resource-id,"${scrollView}")]//*[@text="Increment" or @content-desc="Increment"]`;
}

export function snapUISelectorItemAndroidUIAutomator(text: string): string {
  const id = SnapUIRendererSelectorIDs.selectorItem;
  return `.resourceIdMatches(".*${id}.*").childSelector(new UiSelector().text("${text}"))`;
}

/** iOS SnapUIDropdown bottom-sheet title (`snap_ui.dropdown.title`). */
export const SNAP_UI_DROPDOWN_SHEET_TITLE = 'Select an option';

/** iOS dropdown/selector sheet option — scoped to SelectorItem (not in-form radios). */
export function snapUISelectorItemIosXPath(text: string): string {
  const id = SnapUIRendererSelectorIDs.selectorItem;
  return [
    `//*[@name="${id}" and (@label="${text}" or contains(@label,"${text}") or @name="${text}")]`,
    `//*[@name="${id}"]//*[@label="${text}" or @name="${text}" or @value="${text}"]`,
  ].join(' | ');
}

/**
 * Visible button labels for Android UiScrollable fallbacks when resource-id
 * nodes are virtualized off-screen in the WebView accessibility tree.
 */
export const TEST_SNAPS_ANDROID_SCROLL_LABELS: Record<string, string> = {
  connectbip32: 'Connect to BIP-32 Snap',
  connectbip44: 'Connect to BIP-44 Snap',
  'connectbackground-events': 'Connect to Background Events Snap',
  'connectclient-status': 'Connect to Client Status Snap',
  connectcronjobs: 'Connect to Cronjobs Snap',
  connectdialogs: 'Connect to Dialogs Snap',
  connecterrors: 'Connect to Errors Snap',
  connectGetEntropySnap: 'Connect to Get Entropy Snap',
  connectgetfile: 'Connect to Get File Snap',
  connectimages: 'Connect to Image Snap',
  'connectinteractive-ui': 'Connect to Interactive UI Snap',
  connectjsx: 'Connect to JSX Snap',
  'connectjson-rpc': 'Connect to JSON-RPC Snap',
  'connectlifecycle-hooks': 'Connect to Lifecycle Hooks Snap',
  'connectmanage-state': 'Connect to Manage State Snap',
  'connectmultichain-provider': 'Connect to Multichain Provider Snap',
  // Multichain Provider actions — resource-ids often virtualized until scrolled.
  sendCreateSession: 'Create Session',
  sendRevokeSession: 'Revoke Session',
  'select-multichain-chain': 'Select chain',
  sendMultichainChainId: 'Get Chain ID',
  sendMultichainGetGenesisHash: 'Get Genesis Hash',
  sendMultichainAccounts: 'Get Accounts',
  signMessageMultichain: 'Sign Message',
  signMessageMultichainButton: 'Sign Message',
  signMessageMultichainResult: 'Sign Message',
  signTypedDataMultichain: 'Sign Typed Data',
  signTypedDataMultichainButton: 'Sign Typed Data',
  signTypedDataMultichainResult: 'Sign Typed Data',
  multichainProviderResult: 'Get Accounts',
  'connectname-lookup': 'Connect to Name Lookup Snap',
  'connectnetwork-access': 'Connect to Network Access Snap',
  'connectethereum-provider': 'Connect to Ethereum Provider Snap',
  connectpreferences: 'Connect to Preferences Snap',
  connectstate: 'Connect to State Snap',
  connectwasm: 'Connect to WebAssembly Snap',
  sendError: 'Send Test to Error Snap',
  sendAlertButton: 'Alert',
  // Dialogs section button label is literally "Confirmation"; result/dialog
  // assertions use the native "Confirmation Dialog" title separately.
  sendConfirmationButton: 'Confirmation',
  sendPromptButton: 'Prompt',
  sendCustomButton: 'Custom',
  sendClientStatusTest: 'Submit',
  sendRpc: 'Invoke Snap',
  sendWasmMessage: 'Calculate',
  getPreferences: 'Submit',
  showPreinstalledDialog: 'Show dialog',
  trackEvent: 'Track event',
  'messenger-call': 'Messenger call',
  // Get File — action buttons + nearby label for virtualized result spans.
  sendGetFileTextButton: 'Get Text',
  sendGetFileBase64Button: 'Get Base64',
  sendGetFileHexButton: 'Get Hex',
  getFileResult: 'Get Text',
  // State snap actions (encrypted/unencrypted share the same visible labels).
  sendState: 'Set State',
  sendUnencryptedState: 'Set State',
  sendGetState: 'Get State',
  sendGetUnencryptedState: 'Get State',
  clearState: 'Clear State',
  clearStateUnencrypted: 'Clear State',
  encryptedStateResult: 'Clear State',
  unencryptedStateResult: 'Clear State',
  getStateResult: 'Get State',
  getStateUnencryptedResult: 'Get State',
  // Network Access — prefer section-unique labels (avoid "Get State", shared with State snap).
  sendNetworkAccessTest: 'Fetch',
  startWebSocket: 'Start WebSocket',
  stopWebSocket: 'Stop WebSocket',
  getWebSocketState: 'Start WebSocket',
  networkAccessResult: 'Fetch',
  // Get Entropy — select has no button text; use section heading / sign CTA as anchors.
  'get-entropy-entropy-selector': 'Entropy source',
  entropyMessage: 'Sign Message',
  signEntropyMessage: 'Sign Message',
  entropySignResult: 'Sign Message',
  // Legacy manage-state (Clear Data / Send Data — distinct from State snap Clear State).
  clearManageState: 'Clear Data',
  clearUnencryptedManageState: 'Clear Data',
  sendManageState: 'Send Data',
  sendUnencryptedManageState: 'Send Data',
  clearManageStateResult: 'Clear Data',
  clearUnencryptedManageStateResult: 'Clear Data',
  sendManageStateResult: 'Send Data',
  sendUnencryptedManageStateResult: 'Send Data',
  retrieveManageStateResult: 'Send Data',
  retrieveManageStateUnencryptedResult: 'Send Data',
};

export const testSnapsAndroidScrollOptions = {
  scrollLabels: TEST_SNAPS_ANDROID_SCROLL_LABELS,
};

export const TestSnapResultSelectorWebIDS = {
  bip44ResultSpan: 'bip44Result',
  bip44SignResultSpan: 'bip44SignResult',
  bip32MessageResultEd25519Span: 'bip32MessageResult-ed25519',
  bip32MessageResultSecp256k1Span: 'bip32MessageResult-secp256k1',
  bip32MessageResultEd25519Bip32Span: 'bip32MessageResult-ed25519Bip32',
  bip32PublicKeyResultSpan: 'bip32PublicKeyResult',
  clearManageStateResultSpan: 'clearManageStateResult',
  clearUnencryptedManageStateResultSpan: 'clearUnencryptedManageStateResult',
  clientStatusResultSpan: 'clientStatusResult',
  dialogResultSpan: 'dialogResult',
  errorResultSpan: 'errorResult',
  encryptedStateResultSpan: 'encryptedStateResult',
  entropySignResultSpan: 'entropySignResult',
  getBackgroundEventsResultSpan: 'getBackgroundEventsResult',
  fileResultSpan: 'getFileResult',
  getStateResultSpan: 'getStateResult',
  getStateUnencryptedResultSpan: 'getStateUnencryptedResult',
  installedSnapResultSpan: 'installedSnapsResult',
  networkAccessResultSpan: 'networkAccessResult',
  ethereumProviderResultSpan: 'ethproviderResult',
  multichainProviderResultSpan: 'multichainProviderResult',
  personalSignResultSpan: 'personalSignResult',
  preferencesResultSpan: 'preferencesResult',
  preinstalledResultSpan: 'preinstalledResult',
  retrieveManageStateResultSpan: 'retrieveManageStateResult',
  retrieveManageStateUnencryptedResultSpan:
    'retrieveManageStateUnencryptedResult',
  rpcResultSpan: 'rpcResult',
  scheduleBackgroundEventResultSpan: 'scheduleBackgroundEventResult',
  sendManageStateResultSpan: 'sendManageStateResult',
  sendUnencryptedManageStateResultSpan: 'sendUnencryptedManageStateResult',
  signMessageMultichainResultSpan: 'signMessageMultichainResult',
  signTypedDataResultSpan: 'signTypedDataResult',
  signTypedDataMultichainResultSpan: 'signTypedDataMultichainResult',
  unencryptedStateResultSpan: 'unencryptedStateResult',
  wasmResultSpan: 'wasmResult',
};

export const TestSnapBottomSheetSelectorWebIDS = {
  BOTTOMSHEET_FOOTER_BUTTON_ID: 'bottomsheetfooter-button-subsequent',
  DEFAULT_FOOTER_BUTTON_ID: 'default-snap-footer-button',
  SNAP_FOOTER_BUTTON_ID: 'snap-footer-button',
};
