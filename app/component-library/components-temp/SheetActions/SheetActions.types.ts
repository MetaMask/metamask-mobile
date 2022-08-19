/**
 * Sheet action options.
 */
export interface Action {
  label: string;
  onPress: () => void;
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
