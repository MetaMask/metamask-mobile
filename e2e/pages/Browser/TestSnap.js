import enContent from '../../../locales/languages/en.json';
import Browser from './BrowserView';
import Matchers from '../../utils/Matchers';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import { 
  TestSnapViewSelectorWebIDS, 
  TestSnapInputSelectorWebIDS, 
  TestSnapResultSelectorWebIDS, 
  TestSnapDropdownSelectorWebIDS 
} from '../../selectors/Browser/TestSnap.selectors';
import Gestures from '../../utils/Gestures';
import { SNAP_INSTALL_CANCEL, SNAP_INSTALL_CONNECT, SNAP_INSTALL_CONNECTION_REQUEST } from '../../../app/components/Approvals/InstallSnapApproval/components/InstallSnapConnectionRequest/InstallSnapConnectionRequest.constants';
import { SNAP_INSTALL_PERMISSIONS_REQUEST, SNAP_INSTALL_PERMISSIONS_REQUEST_APPROVE } from '../../../app/components/Approvals/InstallSnapApproval/components/InstallSnapPermissionsRequest/InstallSnapPermissionsRequest.constants';
import { SNAP_INSTALL_OK } from '../../../app/components/Approvals/InstallSnapApproval/InstallSnapApproval.constants';
import TestHelpers from '../../helpers';

export const TEST_SNAPS_URL = 'https://metamask.github.io/snaps/test-snaps/2.23.1/';


class TestSnaps {
  get container() {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID);
  }

  // Connection button getters
  get getConnectBip32Button() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.BIP_32_BUTTON_ID,
    );
  }

  get getConnectBip44Button() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.BIP_44_BUTTON_ID,
    );
  }

  get getConnectClientStatusButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.CLIENT_STATUS_BUTTON_ID,
    );
  }

  get getConnectDialogsButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.DIALOGS_BUTTON_ID,
    );
  }

  get getConnectErrorsButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.ERRORS_BUTTON_ID,
    );
  }

  get getConnectGetEntropyButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.GET_ENTROPY_BUTTON_ID,
    );
  }

  get getConnectGetFileButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.GET_FILE_BUTTON_ID,
    );
  }

  get getConnectHomePageButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.HOME_PAGE_BUTTON_ID,
    );
  }

  get getConnectJsxButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.JSX_BUTTON_ID,
    );
  }

  get getDisplayJsxButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.DISPLAY_JSX_BUTTON_ID,
    );
  }

  get getConnectInteractiveButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.INTERACTIVE_BUTTON_ID,
    );
  }

  get getConnectImagesButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.IMAGES_BUTTON_ID,
    );
  }

  get getConnectLifeCycleButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.LIFECYCLE_BUTTON_ID,
    );
  }

  get getConnectNameLookUpButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.NAME_LOOKUP_BUTTON_ID,
    );
  }

  get getConnectManageStateButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.MANAGE_STATE_BUTTON_ID,
    );
  }

  get getConnectStateButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.STATE_BUTTON_ID,
    );
  }

  get getConnectPreinstalledButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.PREINSTALLED_BUTTON_ID,
    );
  }

  get getConnectProtocolButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.PROTOCOL_BUTTON_ID,
    );
  }

  get getConnectTransactionInsightButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.TRANSACTION_INSIGHT_BUTTON_ID,
    );
  }

  get getConnectUpdateButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.UPDATE_BUTTON_ID,
    );
  }

  get getConnectUpdateNewButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.UPDATE_NEW_BUTTON_ID,
    );
  }

  get getConnectWasmButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.WASM_BUTTON_ID,
    );
  }

  get getConnectNotificationButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.NOTIFICATION_BUTTON_ID,
    );
  }

  get getEthereumProviderConnectButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.ETHEREUM_PROVIDER_CONNECT_BUTTON_ID,
    );
  }

  get getPreferencesConnectButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.PREFERENCES_CONNECT_BUTTON_ID,
    );
  }

  get getConnectNetworkAccessButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.NETWORK_ACCESS_BUTTON_ID,
    );
  }

  get getConnectBackgroundEventsButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.BACKGROUND_EVENTS_BUTTON_ID,
    );
  }

  // Action button getters
  get getConfirmationButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.CONFIRMATION_BUTTON_ID,
    );
  }

  get getCreateDialogButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.CREATE_DIALOG_BUTTON_ID,
    );
  }

  get getCreateDialogDisabledButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.CREATE_DIALOG_DISABLED_BUTTON_ID,
    );
  }

  get getClearManageStateButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.CLEAR_MANAGE_STATE_BUTTON_ID,
    );
  }

  get getClearUnencryptedManageStateButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.CLEAR_UNENCRYPTED_MANAGE_STATE_BUTTON_ID,
    );
  }

  get getGetAccountButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.GET_ACCOUNT_BUTTON_ID,
    );
  }

  get getGetAccountsButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.GET_ACCOUNTS_BUTTON_ID,
    );
  }

  get getGetBip32CompressedPublicKeyButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.GET_BIP32_COMPRESSED_PUBLIC_KEY_BUTTON_ID,
    );
  }

  get getGetBip32PublicKeyButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.GET_BIP32_PUBLIC_KEY_BUTTON_ID,
    );
  }

  get getGetPreferencesSubmitButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.GET_PREFERENCES_SUBMIT_BUTTON_ID,
    );
  }

  get getGetVersionButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.GET_VERSION_BUTTON_ID,
    );
  }

  get getIncrementButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.INCREMENT_BUTTON_ID,
    );
  }

  get getGetSettingsStateButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.GET_SETTINGS_STATE_BUTTON_ID,
    );
  }

  get getPersonalSignButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.PERSONAL_SIGN_BUTTON_ID,
    );
  }

  get getPublicKeyBip44Button() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.PUBLIC_KEY_BIP44_BUTTON_ID,
    );
  }

  get getSendErrorButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SEND_ERROR_BUTTON_ID,
    );
  }

  get getSendExpandedViewNotificationButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SEND_EXPANDED_VIEW_NOTIFICATION_BUTTON_ID,
    );
  }

  get getSendInAppNotificationButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SEND_IN_APP_NOTIFICATION_BUTTON_ID,
    );
  }

  get getSendGetFileBase64Button() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SEND_GET_FILE_BASE64_BUTTON_ID,
    );
  }

  get getSendGetFileHexButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SEND_GET_FILE_HEX_BUTTON_ID,
    );
  }

  get getSendGetFileTextButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SEND_GET_FILE_TEXT_BUTTON_ID,
    );
  }

  get getSendInsightButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SEND_INSIGHT_BUTTON_ID,
    );
  }

  get getSendGetStateButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SEND_GET_STATE_BUTTON_ID,
    );
  }

  get getSendNetworkAccessTestButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SEND_NETWORK_ACCESS_TEST_BUTTON_ID,
    );
  }

  get getSendManageStateButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SEND_MANAGE_STATE_BUTTON_ID,
    );
  }

  get getSendStateButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SEND_STATE_BUTTON_ID,
    );
  }

  get getSendUnencryptedManageStateButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SEND_UNENCRYPTED_MANAGE_STATE_BUTTON_ID,
    );
  }

  get getSendWasmMessageButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SEND_WASM_MESSAGE_BUTTON_ID,
    );
  }

  get getSignBip32MessageSecp256k1Button() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SIGN_BIP32_MESSAGE_SECP256K1_BUTTON_ID,
    );
  }

  get getSignBip44MessageButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SIGN_BIP44_MESSAGE_BUTTON_ID,
    );
  }

  get getSignEd25519Bip32MessageButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SIGN_ED25519_BIP32_MESSAGE_BUTTON_ID,
    );
  }

  get getSignEd25519MessageButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SIGN_ED25519_MESSAGE_BUTTON_ID,
    );
  }

  get getSignEntropyMessageButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SIGN_ENTROPY_MESSAGE_BUTTON_ID,
    );
  }

  get getSignTypedDataButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SIGN_TYPED_DATA_BUTTON_ID,
    );
  }

  get getSubmitClientStatusButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SUBMIT_CLIENT_STATUS_BUTTON_ID,
    );
  }

  get getClearStateButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.CLEAR_STATE_BUTTON_ID,
    );
  }

  get getSendUnencryptedStateButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SEND_UNENCRYPTED_STATE_BUTTON_ID,
    );
  }

  get getSendGetUnencryptedStateButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SEND_GET_UNENCRYPTED_STATE_BUTTON_ID,
    );
  }

  get getClearStateUnencryptedButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.CLEAR_STATE_UNENCRYPTED_BUTTON_ID,
    );
  }

  get getScheduleBackgroundEventWithDateButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SCHEDULE_BACKGROUND_EVENT_WITH_DATE_BUTTON_ID,
    );
  }

  get getScheduleBackgroundEventWithDurationButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SCHEDULE_BACKGROUND_EVENT_WITH_DURATION_BUTTON_ID,
    );
  }

  get getCancelBackgroundEventButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.CANCEL_BACKGROUND_EVENT_BUTTON_ID,
    );
  }

  get getGetBackgroundEventResultButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.GET_BACKGROUND_EVENT_RESULT_BUTTON_ID,
    );
  }

  get getShowPreinstalledDialogButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SHOW_PREINSTALLED_DIALOG_BUTTON_ID,
    );
  }

  // Input field getters
  get getDataManageStateInput() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS.DATA_MANAGE_STATE_INPUT_ID,
    );
  }

  get getDataStateInput() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS.DATA_STATE_INPUT_ID,
    );
  }

  get getDataUnencryptedManageStateInput() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS.DATA_UNENCRYPTED_MANAGE_STATE_INPUT_ID,
    );
  }

  get getEntropyMessageInput() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS.ENTROPY_MESSAGE_INPUT_ID,
    );
  }

  get getGetStateInput() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS.GET_STATE_INPUT_ID,
    );
  }

  get getMessageBip44Input() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS.MESSAGE_BIP44_INPUT_ID,
    );
  }

  get getMessageEd25519Bip32Input() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS.MESSAGE_ED25519_BIP32_INPUT_ID,
    );
  }

  get getMessageEd25519Input() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS.MESSAGE_ED25519_INPUT_ID,
    );
  }

  get getMessageSecp256k1Input() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS.MESSAGE_SECP256K1_INPUT_ID,
    );
  }

  get getPersonalSignMessageInput() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS.PERSONAL_SIGN_MESSAGE_INPUT_ID,
    );
  }

  get getSetStateKeyInput() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS.SET_STATE_KEY_INPUT_ID,
    );
  }

  get getSetStateKeyUnencryptedInput() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS.SET_STATE_KEY_UNENCRYPTED_INPUT_ID,
    );
  }

  get getSignTypedDataMessageInput() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS.SIGN_TYPED_DATA_MESSAGE_INPUT_ID,
    );
  }

  get getDataUnencryptedStateInput() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS.DATA_UNENCRYPTED_STATE_INPUT_ID,
    );
  }

  get getGetUnencryptedStateInput() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS.GET_UNENCRYPTED_STATE_INPUT_ID,
    );
  }

  get getWasmInput() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS.WASM_INPUT_ID,
    );
  }

  get getBackgroundEventDateInput() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS.BACKGROUND_EVENT_DATE_INPUT_ID,
    );
  }

  get getBackgroundEventDurationInput() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS.BACKGROUND_EVENT_DURATION_INPUT_ID,
    );
  }

  get getCancelBackgroundEventInput() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS.CANCEL_BACKGROUND_EVENT_INPUT_ID,
    );
  }

  // Result span getters
  get getBip44ResultSpan() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapResultSelectorWebIDS.BIP44_RESULT_SPAN_ID,
    );
  }

  get getConnectSnapButton() {
    return Matchers.getElementByID(
      SNAP_INSTALL_CONNECT
    );
  }

  get getCancelSnapConnectionRequestButton() {
    return Matchers.getElementByID(
      SNAP_INSTALL_CANCEL
    );
  }

  get getConnectSnapPermissionsRequestButton() {
    return Matchers.getElementByID(
      SNAP_INSTALL_PERMISSIONS_REQUEST
    );
  }

  get getApproveSnapPermissionsRequestButton() {
    return Matchers.getElementByID(
      SNAP_INSTALL_PERMISSIONS_REQUEST_APPROVE
    );
  }

  get getCancelSnapPermissionsRequestButton() {
    return Matchers.getElementByID(
      SNAP_INSTALL_CANCEL
    );
  }

  get getConnectSnapInstallOkButton() {
    return Matchers.getElementByID(
      SNAP_INSTALL_OK
    );
  }

  get getApproveSignRequestButton() {
    return Matchers.getElementByID(
      'bottomsheetfooter-button-subsequent'
    );
  }

  get getSignBip44MessageResultSpan() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapResultSelectorWebIDS.BIP44_SIGN_RESULT_SPAN_ID,
    );
  }

  // Method to get text from BIP44 result span
  async getBip44ResultText() {
    return await Browser.getWebElementText(
      TestSnapResultSelectorWebIDS.BIP44_RESULT_SPAN_ID,
    );
  }

  async getSignBip44MessageResultText() {
    return await Browser.getWebElementText(
      TestSnapResultSelectorWebIDS.BIP44_SIGN_RESULT_SPAN_ID,
    );
  }

  async getBip32PublicKeyResultText() {
    return await Browser.getWebElementText(
      TestSnapResultSelectorWebIDS.BIP32_PUBLIC_KEY_RESULT_SPAN_ID,
    );
  }

  async getSignBip32MessageSecp256k1ResultText() {
    return await Browser.getWebElementText(
      TestSnapResultSelectorWebIDS.BIP32_MESSAGE_RESULT_ED25519_BIP32_SPAN_ID,
    );
  }

  async typeSignMessage(message) {
    await Gestures.typeInWebElement(this.getMessageBip44Input, message);
  }

  async swipeUpSmall() {
    await Gestures.swipe(this.container, 'up', 'slow', 0.2);
  }

  // Methods
  async navigateToTestSnap() {
    await Browser.navigateToURL(TEST_SNAPS_URL);
  }

  async tapButton(elementId) {
    await Gestures.scrollToWebViewPort(elementId);
    await Gestures.tapWebElement(elementId);
  }

  async connectToSnap() {
    await Gestures.waitAndTap(this.getConnectSnapButton, { skipVisibilityCheck: true, delayBeforeTap: 2500 });
  }

  async connectToSnapPermissionsRequest() {
    await Gestures.waitAndTap(this.getConnectSnapPermissionsRequestButton, { skipVisibilityCheck: true, delayBeforeTap: 2500 });
  }

  async approveSnapPermissionsRequest() {
    await Gestures.waitAndTap(this.getApproveSnapPermissionsRequestButton, { skipVisibilityCheck: true, delayBeforeTap: 2500 });
  }

  async cancelSnapPermissionsRequest() {
    await Gestures.waitAndTap(this.getCancelSnapPermissionsRequestButton, { skipVisibilityCheck: true, delayBeforeTap: 2500 });
  }

  async connectToSnapInstallOk() {
    await Gestures.waitAndTap(this.getConnectSnapInstallOkButton, { skipVisibilityCheck: true, delayBeforeTap: 2500 });
  }

  async tapPublicKeyBip44Button() {
    await this.tapButton(this.getPublicKeyBip44Button);
  }

  async tapSignBip44MessageButton() {
    await this.tapButton(this.getSignBip44MessageButton);
  }

  async tapGetBip32PublicKeyButton() {
    await this.tapButton(this.getGetBip32PublicKeyButton);
  }

  async tapSignBip32MessageSecp256k1Button() {
    await this.tapButton(this.getSignBip32MessageSecp256k1Button);
  }

  async approveSignRequest() {
    await Gestures.waitAndTap(this.getApproveSignRequestButton);
  }

  async connectToBip44Snap() {
    await this.tapButton(this.getConnectBip44Button);
  }

  async connectToBip32Snap() {
    await this.tapButton(this.getConnectBip32Button);
  }

  async connectToDialogsSnap() {
    await this.tapButton(this.getConnectDialogsButton);
  }

  async connectToErrorsSnap() {
    await this.tapButton(this.getConnectErrorsButton);
  }

  async connectToGetEntropySnap() {
    await this.tapButton(this.getConnectGetEntropyButton);
  }

  async connectToManageStateSnap() {
    await this.tapButton(this.getConnectManageStateButton);
  }

  async connectToNotificationSnap() {
    await this.tapButton(this.getConnectNotificationButton);
  }

  async connectToTransactionInsightSnap() {
    await this.tapButton(this.getConnectTransactionInsightButton);
  }

  async connectToInteractiveSnap() {
    await this.tapButton(this.getConnectInteractiveButton);
  }

  async connectToImagesSnap() {
    await this.tapButton(this.getConnectImagesButton);
  }

  async connectToJsxSnap() {
    await this.tapButton(this.getConnectJsxButton);
  }

  async connectToLifeCycleSnap() {
    await this.tapButton(this.getConnectLifeCycleButton);
  }

  async connectToNameLookUpSnap() {
    await this.tapButton(this.getConnectNameLookUpButton);
  }

  async connectToStateSnap() {
    await this.tapButton(this.getConnectStateButton);
  }

  async connectToPreinstalledSnap() {
    await this.tapButton(this.getConnectPreinstalledButton);
  }

  async connectToProtocolSnap() {
    await this.tapButton(this.getConnectProtocolButton);
  }

  async connectToUpdateSnap() {
    await this.tapButton(this.getConnectUpdateButton);
  }

  async connectToWasmSnap() {
    await this.tapButton(this.getConnectWasmButton);
  }

  async connectToEthereumProviderSnap() {
    await this.tapButton(this.getEthereumProviderConnectButton);
  }

  async connectToPreferencesSnap() {
    await this.tapButton(this.getPreferencesConnectButton);
  }

  async connectToNetworkAccessSnap() {
    await this.tapButton(this.getConnectNetworkAccessButton);
  }

  async connectToBackgroundEventsSnap() {
    await this.tapButton(this.getConnectBackgroundEventsButton);
  }
}

export default new TestSnaps();
