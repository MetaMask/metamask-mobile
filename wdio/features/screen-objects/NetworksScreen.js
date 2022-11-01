import {

} from '../testIDs/Screens/NetworksScreen.testids';
import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';

class NetworksScreen {

    get getPopularNetworksTab() {
        return Selectors.getElementByPlatform('POPULAR');
    }

    get getCustomNetworks() {
        return Selectors.getElementByPlatform('CUSTOM NETWORKS');
    }

    get addNetworkButton() {
        return Selectors.getElementByPlatform('add-network-button');
    }

    get networkNameInputField() {
        return Selectors.getElementByPlatform('input-network-name');
    }

    get rpcURLInputField() {
        return Selectors.getElementByPlatform('input-rpc-url');
    }

    get inputChainIdField() {
        return Selectors.getElementByPlatform('input-chain-id');
    }

    get inputNetworkSymbolField() {
        return Selectors.getElementByPlatform('input-network-symbol');
    }

    get blockExplorerInputField() {
        return Selectors.getElementByPlatform('block-explorer');
    }

    get removeNetworkButton() {
        return Selectors.getElementByPlatform('remove-network-button');
    }

    get saveNetworkButton() {
        return Selectors.getElementByPlatform(' add-network-button');
    }

    async isPopularNetworksTabVisible() {
        await expect(this.getPopularNetworksTab).toBeDisplayed();
    }

    async isCustomNetworksTabVisible() {
        await expect(this.getCustomNetworks).toBeDisplayed();
    }

    async selectNetwork(network) {
        // eslint-disable-next-line no-undef
        await $(`//android.widget.TextView[@text='${network}']`).click();
    }

    async tapAndHoldNetwork(network) {
        // eslint-disable-next-line no-undef
        await $(`//android.widget.TextView[@text='${network}']`).touchAction('longPress');
    }

    async tapAddNetworkButton() {
        Gestures.tap(this.addNetworkButton);
    }

    async tapPopularNetworksTab() {
        Gestures.tap(this.getPopularNetworksTab);
    }

    async tapCustomNetworksTab() {
        Gestures.tap(this.getCustomNetworks);
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
}


export default new NetworksScreen();
