/**
 * Props for PerpsBottomTabBar component
 */
export interface PerpsBottomTabBarProps {
  /**
   * Currently active tab identifier
   * @default undefined (no tab is marked as active)
   */
  activeTab?:
    | 'wallet'
    | 'browser'
    | 'trade'
    | 'activity'
    | 'rewards'
    | 'settings';

  /**
   * Optional custom navigation handlers
   * If not provided, uses default navigation behavior
   */
  onWalletPress?: () => void;
  onBrowserPress?: () => void;
  onActionsPress?: () => void;
  onActivityPress?: () => void;
  onRewardsOrSettingsPress?: () => void;

  /**
   * Test ID for the tab bar container
   */
  testID?: string;
}
