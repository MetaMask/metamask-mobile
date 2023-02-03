// External dependencies.
import { ButtonTertiaryVariant } from '../../../component-library/components/Buttons/ButtonTertiary';

/**
 * Sheet action options.
 */
export interface Action {
  label: string;
  onPress: () => void;
  testID?: string;
  disabled?: boolean;
  isLoading?: boolean;
  variant?: ButtonTertiaryVariant;
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
