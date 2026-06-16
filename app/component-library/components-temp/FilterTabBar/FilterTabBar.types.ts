import type { StyleProp, ViewStyle } from 'react-native';

/**
 * A single selectable tab rendered inside the {@link FilterTabBar}.
 */
export interface FilterTab {
  /**
   * Stable, unique identifier for the tab. Returned via `onSelect` and compared
   * against `selectedKey` to determine the active state.
   */
  key: string;
  /**
   * Visible label rendered inside the filter button.
   */
  label: string;
  /**
   * Optional test identifier applied to the underlying button.
   */
  testID?: string;
}

/**
 * FilterTabBar component props.
 */
export interface FilterTabBarProps {
  /**
   * Ordered list of tabs to render.
   */
  tabs: FilterTab[];
  /**
   * Key of the currently selected tab.
   */
  selectedKey: string;
  /**
   * Called with the tab key when a tab is pressed.
   */
  onSelect: (key: string) => void;
  /**
   * Optional style applied to the scrollable wrapper.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Optional test identifier applied to the wrapper.
   */
  testID?: string;
}
