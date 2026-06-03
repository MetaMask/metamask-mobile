import Matchers from '../../framework/Matchers';
import {
  NetworkNonPemittedBottomSheetSelectorsIDs,
  NetworkNonPemittedBottomSheetSelectorsText,
} from '../../../app/components/Views/NetworkConnect/NetworkNonPemittedBottomSheet.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class NetworkNonPemittedBottomSheet {
  get addThisNetworkTitle(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          NetworkNonPemittedBottomSheetSelectorsText.ADD_THIS_NETWORK_TITLE,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          NetworkNonPemittedBottomSheetSelectorsText.ADD_THIS_NETWORK_TITLE,
        ),
    });
  }

  get sepoliaNetworkName(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          NetworkNonPemittedBottomSheetSelectorsText.SEPOLIA_NETWORK_NAME,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          NetworkNonPemittedBottomSheetSelectorsText.SEPOLIA_NETWORK_NAME,
        ),
    });
  }

  get ethereumMainNetNetworkName(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          NetworkNonPemittedBottomSheetSelectorsText.ETHEREUM_MAIN_NET_NETWORK_NAME,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          NetworkNonPemittedBottomSheetSelectorsText.ETHEREUM_MAIN_NET_NETWORK_NAME,
        ),
    });
  }

  get addThisNetworkButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          NetworkNonPemittedBottomSheetSelectorsIDs.ADD_THIS_NETWORK_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworkNonPemittedBottomSheetSelectorsIDs.ADD_THIS_NETWORK_BUTTON,
        ),
    });
  }

  get lineaSepoliaNetworkName(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          NetworkNonPemittedBottomSheetSelectorsText.LINEA_SEPOLIA_NETWORK_NAME,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          NetworkNonPemittedBottomSheetSelectorsText.LINEA_SEPOLIA_NETWORK_NAME,
        ),
    });
  }

  get elysiumTestnetNetworkName(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          NetworkNonPemittedBottomSheetSelectorsText.ELYSIUM_TESTNET_NETWORK_NAME,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          NetworkNonPemittedBottomSheetSelectorsText.ELYSIUM_TESTNET_NETWORK_NAME,
        ),
    });
  }

  get chooseFromPermittedNetworksButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          NetworkNonPemittedBottomSheetSelectorsIDs.CHOOSE_FROM_PERMITTED_NETWORKS_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworkNonPemittedBottomSheetSelectorsIDs.CHOOSE_FROM_PERMITTED_NETWORKS_BUTTON,
        ),
    });
  }

  get editPermissionsButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          NetworkNonPemittedBottomSheetSelectorsIDs.EDIT_PERMISSIONS_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworkNonPemittedBottomSheetSelectorsIDs.EDIT_PERMISSIONS_BUTTON,
        ),
    });
  }

  async tapAddThisNetworkButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.addThisNetworkButton, {
      elemDescription: 'Add this network button',
    });
  }

  async tapSepoliaNetworkName(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.sepoliaNetworkName, {
      elemDescription: 'Sepolia network name',
    });
  }

  async tapEthereumMainNetNetworkName(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.ethereumMainNetNetworkName, {
      elemDescription: 'Ethereum main net network name',
    });
  }

  async tapLineaSepoliaNetworkName(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.lineaSepoliaNetworkName, {
      elemDescription: 'Linea Sepolia network name',
    });
  }

  async tapElysiumTestnetNetworkName(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.elysiumTestnetNetworkName, {
      elemDescription: 'Elysium testnet network name',
    });
  }

  async tapChooseFromPermittedNetworksButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.chooseFromPermittedNetworksButton, {
      elemDescription: 'Choose from permitted networks button',
    });
  }

  async tapEditPermissionsButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.editPermissionsButton, {
      elemDescription: 'Edit permissions button',
    });
  }
}

export default new NetworkNonPemittedBottomSheet();
