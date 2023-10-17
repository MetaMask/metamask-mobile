/**
 * Options for displaying the action button on the right of the title.
 */
export interface SheetHeaderActionButtonOptions {
  label: string;
  onPress: () => void;
}

/**
 * SheetHeader component props.
 */
export interface SheetHeaderProps {
  /**
   * Sheet title.
   */
  title: string;
  /**
   * Optional callback when back button is pressed. The back button appears when this property is set.
   */
  onBack?: () => void;
  /**
   * Optional action options, which includes a callback when the action button is pressed. The action button appears when this property is set.
   */
  actionButtonOptions?: SheetHeaderActionButtonOptions;
}
