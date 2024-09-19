import { AvatarSize } from '../../components/Avatars/Avatar';
import { ButtonIconSizes } from '../../components/Buttons/ButtonIcon';
import { TextColor, TextVariant } from '../../components/Texts/Text';
import { ReactNode } from 'react';
import { ImageSourcePropType } from 'react-native';

interface KeyValueRowTooltip {
  title: string;
  text: string;
  size?: ButtonIconSizes;
}

interface KeyValueRowIcon {
  src: ImageSourcePropType;
  name: string;
  isIpfsGatewayCheckBypassed?: boolean;
  size?: AvatarSize;
}

interface KeyValueRowField {
  text: string;
  variant?: TextVariant;
  color?: TextColor;
  icon?: KeyValueRowIcon;
  tooltip?: KeyValueRowTooltip;
}

export const IconSizes = AvatarSize;

export const TooltipSizes = ButtonIconSizes;

export interface KeyValueRowLabelProps {
  label: string;
  variant?: TextVariant;
  color?: TextColor;
  tooltip?: KeyValueRowTooltip;
}

export interface KeyValueRowRootProps {
  // Must have exactly two children.
  children: [ReactNode, ReactNode];
}

export enum SectionDirections {
  ROW = 'row',
  COLUMN = 'column',
}

export enum SectionAlignments {
  LEFT = 'flex-start',
  RIGHT = 'flex-end',
  CENTER = 'center',
}

export interface KeyValueSectionProps {
  children: ReactNode;
  direction?: SectionDirections;
  align?: SectionAlignments;
}

interface KeyValueRowText {
  primary: KeyValueRowField;
  secondary?: KeyValueRowField;
}

export interface KeyValueRowProps {
  field: KeyValueRowText;
  value: KeyValueRowText;
}
