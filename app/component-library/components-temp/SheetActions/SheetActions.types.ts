/**
 * Sheet action options.
 */
export interface Action {
  label: string;
  onPress: () => void;
  testID?: string;
  disabled?: boolean;
  isLoading?: boolean;
  isDanger?: boolean;
}

/**
 * SheetActionsProps props.
 */
export interface SheetActionsProps {
  /**
   * List of actions.
   */
  actions: Action[];
}
