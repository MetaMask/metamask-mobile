// Third party dependencies.
import { PressableProps, StyleProp, ViewStyle } from 'react-native';

// External dependencies.
import { IconName } from '../../components/Icons/Icon';

/**
 * MainActionButton component props.
 */
export interface MainActionButtonProps extends PressableProps {
  /**
   * Optional style applied to the outermost Animated.View container.
   * Use this to control layout (e.g. flex: 1) without adding a wrapper node.
   */
  containerStyle?: StyleProp<ViewStyle>;
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
  /**
   * Ignored by the elevation prototype. Primary actions are not glass.
   * Home passes `isRaisedPlate` instead.
   */
  isGlass?: boolean;
  /**
   * L2 opaque plate with a sheen. Home Buy/Swap/Send/Receive only.
   * Distinct from header Liquid Glass: solid fill, no `GlassView`.
   */
  isRaisedPlate?: boolean;
}

/**
 * Style sheet input parameters.
 */
export type MainActionButtonStyleSheetVars = Pick<
  MainActionButtonProps,
  'style'
> & {
  isDisabled: boolean;
  isRaisedPlate: boolean;
};
