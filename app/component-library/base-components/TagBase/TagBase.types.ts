// External dependencies
import { TextProps } from '../../components/Texts/Text/Text.types';
import { ListItemProps } from '../../components/List/ListItem/ListItem.types';

/**
 * TagBase Shape.
 */
export enum TagShape {
  Pill = 'Pill',
  Rectangle = 'Rectangle',
}

/**
 * Tag Severity.
 */
export enum TagSeverity {
  Default = 'Default',
  Neutral = 'Neutral',
  Success = 'Success',
  Info = 'Info',
  Danger = 'Danger',
  Warning = 'Warning',
}

/**
 * TagBase component props.
 */
export interface TagBaseProps extends ListItemProps {
  /**
   * Optional content to be displayed before the children.
   */
  startAccessory?: React.ReactNode;
  /**
   * Content to wrap to display.
   */
  children: React.ReactNode | string;
  /**
   * Optional prop to configure the prop of children if a string is given.
   */
  textProps?: TextProps;
  /**
   * Optional content to be displayed after the children.
   */
  endAccessory?: React.ReactNode;
  /**
   * Optional prop to configure the shape of the TagBase.
   * @default TagShape.Pill
   */
  shape?: TagShape;
  /**
   * Optional prop to configure the severity of the TagBaseProps.
   * @default TagSeverity.Default
   */
  severity?: TagSeverity;
  /**
   * Optional prop to configure to show the border or not.
   * @default false
   */
  includesBorder?: boolean;
  /**
   * Optional prop to configure the gap between startAccessory, children, and
   * endAccessory.
   * @default 8
   */
  gap?: number | string;
}
/**
 * Style sheet input parameters.
 */
export type TagBaseStyleSheetVars = Pick<TagBaseProps, 'style'> & {
  shape: TagShape;
  containerSize: { width: number; height: number } | null;
  severity: TagSeverity;
  includesBorder: boolean;
};
