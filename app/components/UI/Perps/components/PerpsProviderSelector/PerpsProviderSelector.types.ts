import type { PerpsProviderType } from '@metamask/perps-controller';

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
   * Currently selected provider
   */
  selectedProvider?: PerpsProviderType;

  /**
   * Callback when a provider is selected
   */
  onProviderSelect: (providerId: PerpsProviderType) => void;

  /**
   * Test ID for testing purposes
   */
  testID?: string;
}

/**
 * Provider display info for UI
 */
export interface ProviderDisplayInfo {
  id: PerpsProviderType;
  name: string;
  description: string;
  iconName?: string;
}
