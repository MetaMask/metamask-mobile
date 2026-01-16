// Third party dependencies.
import { Props } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

// External dependencies.
import { IconName } from '../../components/Icons/Icon';

/**
 * MainActionButton component props.
 */
export interface MainActionButtonProps extends PressableProps {
  /**
   * Icon name of the icon that will be displayed.
   */
  iconName: IconName;
  /**
   * Label text that will be displayed below the icon.
   */
  label: string;
  /**
   * Optional param to disable the button.
   */
  isDisabled?: boolean;
}

/**
 * Style sheet input parameters.
 */
export type MainActionButtonStyleSheetVars = Pick<
  MainActionButtonProps,
  'style'
> & {
  isDisabled: boolean;
};
