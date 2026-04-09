import type { PerpsActiveProviderMode } from '@metamask/perps-controller';

/**
 * Props for PerpsProviderSelectorBadge component
 */
export interface PerpsProviderSelectorBadgeProps {
  /**
   * Test ID for testing purposes
   */
  testID?: string;
}

/**
 * Props for PerpsProviderSelectorSheet component
 */
export interface PerpsProviderSelectorSheetProps {
  /**
   * Whether the bottom sheet is visible
   */
  isVisible: boolean;

  /**
   * Callback when the sheet is closed
   */
  onClose: () => void;

  /**
   * Currently selected option ID (e.g. 'hyperliquid-mainnet')
   */
  selectedOptionId?: string;

  /**
   * Callback when an option is selected
   */
  onOptionSelect: (option: ProviderNetworkOption) => void | Promise<void>;

  /**
   * Test ID for testing purposes
   */
  testID?: string;
}

/**
 * Provider display info for UI
 */
export interface ProviderDisplayInfo {
  id: PerpsActiveProviderMode;
  name: string;
  description: string;
  iconName?: string;
}

/**
 * Combined provider + network option for the unified selector
 */
export interface ProviderNetworkOption {
  id: string;
  providerId: PerpsActiveProviderMode;
  isTestnet: boolean;
  name: string;
  network: string;
  description: string;
}
