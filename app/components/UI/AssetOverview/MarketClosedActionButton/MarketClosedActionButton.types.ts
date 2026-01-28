// Third party dependencies.
import { PressableProps } from 'react-native';

// External dependencies.
import { IconName } from '../../../../component-library/components/Icons/Icon';

/**
 * MainActionButton component props.
 */
export interface MarketClosedActionButtonProps extends PressableProps {
  /**
   * Icon name of the icon that will be displayed.
   */
  iconName: IconName;
  /**
   * Label text that will be displayed below the icon.
   */
  label: string;
}

/**
 * Style sheet input parameters.
 */
export type MarketClosedActionButtonStyleSheetVars = Pick<
  MarketClosedActionButtonProps,
  'style'
>;
