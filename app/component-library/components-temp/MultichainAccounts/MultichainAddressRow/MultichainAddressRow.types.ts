import { CaipChainId } from '@metamask/utils';
import { IconName } from '@metamask/design-system-react-native';

export interface Icon {
  /**
   * Icon name to display
   */
  name: IconName;
  /**
   * Callback function to execute when the icon is pressed
   * This can be used for actions like copying the address or navigating to a different screen
   */
  callback: () => void;
  /**
   * Test ID for the icon, useful for testing purposes
   * Should be unique to each icon in the row
   */
  testId: string;
}

export interface CopyToastOptions {
  variant: 'Plain';
  labelOptions: { label: string }[];
  hasNoTimeout: boolean;
  closeButtonOptions: {
    variant: 'Icon';
    iconName: IconName;
    onPress: () => void;
  };
}

export interface CopyToastRef {
  // Keep legacy ToastRef structurally assignable without importing deprecated Toast types.
  showToast(toastOptions: never): void;
  closeToast(): void;
}

/**
 * Parameters for the copy operation.
 */
export interface CopyParams {
  /**
   * Callback function to execute when the copy action is successful
   */
  callback: () => Promise<void>;
  /**
   * Technically optional to keep types simple but toast ref for showing toast notification
   * should always be present if copyParams is used. This ensures consistent behavior
   */
  toastRef?: React.RefObject<CopyToastRef | null>;
  /**
   * Required toast message. Specify what is being copied e.g. "Address copied", "Private key copied", etc
   */
  toastMessage: string;
}

export interface MultichainAddressRowProps {
  /**
   * Chain ID to identify the network
   */
  chainId: CaipChainId;
  /**
   * Network name to display
   */
  networkName: string;
  /**
   * Address string to display (will be truncated)
   */
  address: string;
  /**
   * Copy operation parameters
   */
  copyParams?: CopyParams;
  /**
   * Object containing icons to display in the row.
   * Each icon should have a name, a callback function, and test ID.
   * The callback will be executed when the icon is pressed.
   * Icons are displayed in the order they are provided.
   */
  icons?: Icon[];

  /**
   * Optional test ID for testing purposes
   */
  testID?: string;
}
