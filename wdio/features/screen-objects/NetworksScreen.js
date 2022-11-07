// eslint-disable-next-line no-unused-vars
/* global driver */
import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import {INPUT_CHAIN_ID_FIELD,
    INPUT_RPC_URL_FIELD, ADD_NETWORK_BUTTON, 
    INPUT_NETWORK_NAME,
    NETWORKS_SYMBOL_INPUT_FIELD} from '../testIDs/Screens/NetworksScreen.testids';

class NetworksScreen {

    get getPopularNetworksTab() {
        return Selectors.getElementByPlatform('POPULAR');
    }

    get getCustomNetworks() {
        return Selectors.getElementByPlatform('CUSTOM NETWORKS');
    }

    get addNetworkButton() {
        return Selectors.getElementByPlatform(ADD_NETWORK_BUTTON);
    }

    get networkNameInputField() {
        return Selectors.getElementByPlatform(INPUT_NETWORK_NAME);
    }

    get rpcURLInputField() {
        return Selectors.getElementByPlatform(INPUT_RPC_URL_FIELD);
    }

    get inputChainIdField() {
        return Selectors.getElementByPlatform(INPUT_CHAIN_ID_FIELD);
    }

    get inputNetworkSymbolField() {
        return Selectors.getElementByPlatform(NETWORKS_SYMBOL_INPUT_FIELD);
    }

    get blockExplorerInputField() {
        return Selectors.getElementByPlatform('block-explorer');
    }

    get removeNetworkButton() {
        return Selectors.getElementByPlatform('remove-network-button');
    }

    get saveNetworkButton() {
        return Selectors.getElementByPlatform('add-network-button');
    }

    async isPopularNetworksTabVisible() {
        await expect(this.getPopularNetworksTab).toBeDisplayed();
    }

    async isCustomNetworksTabVisible() {
        await expect(this.getCustomNetworks).toBeDisplayed();
    }

    async selectNetwork(network) {
       await Gestures.tapTextByXpath(network);
    }

    async tapAndHoldNetwork(network) {
       await Gestures.tapTextByXpath(network, 'LONGPRESS');// does not work after update for some reason
    }

    async tapAddNetworkButton() {
        await Gestures.tap(this.addNetworkButton);
    }

    async tapPopularNetworksTab() {
        await Gestures.tap(this.getPopularNetworksTab);
    }

    async tapCustomNetworksTab() {
        await Gestures.tap(this.getCustomNetworks);
    }

    async isNetworkNameVisible() {
        await expect(this.networkNameInputField).toBeDisplayed();
    }

    async typeIntoNetworkName(text) {
        await Gestures.typeText(this.networkNameInputField, text);
    }

    async isRPCUrlFieldVisible() {
        await expect(this.rpcURLInputField).toBeDisplayed();
    }

    async typeIntoRPCURLField(text) {
        await Gestures.typeText(this.rpcURLInputField, text);
    }

    async isChainIDInputVisible() {
        await expect(this.inputChainIdField).toBeDisplayed();
    }

    async typeIntoCHAINIDInputField(text) {
        await Gestures.typeText(this.inputChainIdField, text);
    }

    async isNetworkSymbolFieldVisible() {
        await expect(this.inputNetworkSymbolField).toBeDisplayed();
    }

    async typeIntoNetworkSymbol(text) {
        await Gestures.typeText(this.inputNetworkSymbolField, text);
    }

    async isBlockExplorerUrlVisible() {
        await expect(this.blockExplorerInputField).toBeDisplayed();
    }

    async addButtonNetworkIsdisabled() {
        await expect(this.addNetworkButton).toHaveAttrContaining('clickable','false');
    }

    async tapAddButton() {
        await Gestures.tap(this.addNetworkButton);
    }

    async isDeleteNetworkButtonVisible() {
        await expect(this.removeNetworkButton).toBeDisplayed();
    }

    async tapDeleteNetworkButton() {
        await Gestures.tap(this.removeNetworkButton);
    }

    async tapSaveNetworkButton() {
        await Gestures.tap(this.saveNetworkButton);
    }

    async isSaveNetworkButtonVisible() {
        await expect(this.saveNetworkButton).toBeDisplayed();
    }

    async tapRemoveNetworkButton(text) {
        await Gestures.tapTextByXpath(text);
    }

    async isButtonTextVisibleByXpath(text) {
       await expect(await (Selectors.getXpathElementByText(text))).toBeDisplayed();
    }

    async isNetworkRemoved(network) {
       await expect(await (Selectors.getXpathElementByText(network))).not.toBeDisplayed();
    }

    async tapOnNetwork(network) {
       await Gestures.tapTextByXpath(network);
    }

    async isNetworkVisible(text) {
        await expect(await (Selectors.getXpathElementByText(text))).toBeDisplayed();
    }

    async isNetworkNotVisible(text) {
       await expect(await (Selectors.getXpathElementByText(text))).not.toBeDisplayed();
    }

    async tapOptionInSettings(text) {
       await Gestures.tapTextByXpath(text);
    }

    async isNetworknameDisplayed(network) {
        await expect(await (Selectors.getXpathElementByText(network))).toBeDisplayed();
    }
}


export default new NetworksScreen();
