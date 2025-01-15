import { IconName } from '../../../component-library/components/Icons/Icon';
import { TextColor } from '../../../component-library/components/Texts/Text';

export interface SettingsDrawerProps {
  title: string;
  /**
   * Additional descriptive text about this option
   */
  description?: string;
  /**
   * Disable bottom border
   */
  noBorder?: boolean;
  /**
   * Handler called when this drawer is pressed
   */
  onPress?: () => void;
  /**
   * Display SettingsNotification
   */
  warning?: string;
  /**
   * Icon name
   */
  iconName?: IconName;
  /**
   * Icon color
   */
  iconColor?: string;
  /**
   * Display arrow right
   */
  renderArrowRight?: boolean;
  /**
   * First item
   */
  isFirst?: boolean;
  /**
   * Last item
   */
  isLast?: boolean;
  /**
   * Test id for testing purposes
   */
  testID?: string;
  /**
   * Title color
   */
  titleColor?: TextColor;
}
