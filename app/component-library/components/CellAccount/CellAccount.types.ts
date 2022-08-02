import { StyleProp, TouchableOpacityProps, ViewStyle } from 'react-native';
import { AccountAvatarType } from '../AccountAvatar';

/**
 * Cell Account component props.
 */
export interface CellAccountProps extends TouchableOpacityProps {
  /**
   * Callback to trigger when pressed.
   */
  onPress: () => void;
  /**
   * An Ethereum wallet address to retrieve avatar
   */
  accountAddress: string;
  /**
   * AccountAvatar variants.
   */
  accountAvatarType: AccountAvatarType;
  /**
   * Title of the Cell Account, 1 line truncation
   */
  title: string;
  /**
   * Optional secondary text below the title, 1 line truncation
   */
  secondaryText?: string;
  /**
   * Optional tertiary text below the secondaryText, 1 line truncation
   */
  tertiaryText?: string;
  /**
   * Optional label (using Tag component) below the title/secondaryText/tertiaryText
   */
  tagLabel?: string;
  /**
   * Optional boolean to show Checkbox in Cell Account, applicable for multi select view
   * @default false
   */
  isMultiSelect?: boolean;
  /**
   * Optional boolean to show Selected state in Cell Account
   * @default false
   */
  isSelected?: boolean;
  /**
   * Optional accessory that can be inserted on the right of Cell Account
   */
  children?: React.ReactNode;
  /**
   * Escape hatch for applying extra styles. Only use if absolutely necessary.
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * Style sheet input parameters.
 */
export type CellAccountStyleSheetVars = Pick<CellAccountProps, 'style'>;
