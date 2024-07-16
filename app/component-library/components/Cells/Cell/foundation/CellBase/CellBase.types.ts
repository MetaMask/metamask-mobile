// External dependencies.
import { AvatarProps } from '../../../../Avatars/Avatar/Avatar.types';
import { ListItemProps } from '../../../../List/ListItem/ListItem.types';

/**
 * Cell Account component props.
 */
export interface CellBaseProps extends ListItemProps {
  /**
   * Props for avatar component (with the exception of size).
   * Avatar size is defaulted to size Md (32x32) for Cells
   */
  avatarProps: AvatarProps;
  /**
   * Title of the Cell Account, 1 line truncation.
   */
  title: string | React.ReactNode;
  /**
   * Optional secondary text below the title, 1 line truncation.
   */
  secondaryText?: string | React.ReactNode;
  /**
   * Optional tertiary text below the secondaryText, 1 line truncation.
   */
  tertiaryText?: string | React.ReactNode;
  /**
   * Optional label (using Tag component) below the title/secondaryText/tertiaryText.
   */
  tagLabel?: string;
  /**
   * Optional accessory that can be inserted on the right of Cell Account.
   */
  children?: React.ReactNode;
}

/**
 * Style sheet input parameters.
 */
export type CellBaseStyleSheetVars = Pick<CellBaseProps, 'style'>;
