import { PressableProps } from 'react-native';
import { TextProps } from '@metamask/design-system-react-native';

/**
 * ButtonFilter component props.
 */
export interface ButtonFilterProps extends PressableProps {
  /**
   * The label text to display in the button.
   */
  label: string;
  /**
   * Whether the button is in an active state.
   */
  isActive?: boolean;
  /**
   * Optional additional props to pass to the Text component.
   */
  labelProps?: Partial<TextProps>;
}
