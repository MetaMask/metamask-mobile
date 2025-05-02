// Third party dependencies.
import { StyleProp, ViewStyle } from 'react-native';

// External dependencies.
import { AvatarProps } from '../../../../Avatars/Avatar/Avatar.types';

/**
 * Cell Account component props.
 */
export interface CellBaseProps {
  /**
   * Props for avatar component (with the exception of size).
   * Avatar size is restricted to size Md (32x32) for Cells
   */
  avatarProps: AvatarProps;
  /**
   * Title of the Cell Account, 1 line truncation.
   */
  title: string;
  /**
   * Optional secondary text below the title, 1 line truncation.
   */
  secondaryText?: string;
  /**
   * Optional tertiary text below the secondaryText, 1 line truncation.
   */
  tertiaryText?: string;
  /**
   * Optional label (using Tag component) below the title/secondaryText/tertiaryText.
   */
  tagLabel?: string;
  /**
   * Optional accessory that can be inserted on the right of Cell Account.
   */
  children?: React.ReactNode;
  /**
   * Optional prop to control the style of the CellBase.
   */
  style?: StyleProp<ViewStyle> | undefined;

  /**
   * Optional prop to control the visibility of the secondary text icon.
   */
  showSecondaryTextIcon?: boolean;
}

/**
 * Style sheet input parameters.
 */
export type CellBaseStyleSheetVars = Pick<CellBaseProps, 'style'>;
