import { AvatarSize } from '../../components/Avatars/Avatar';
import { ButtonIconSizes } from '../../components/Buttons/ButtonIcon';
import { TextColor, TextVariant } from '../../components/Texts/Text';
import { ReactNode } from 'react';
import { ImageSourcePropType } from 'react-native';

export interface KeyValueRowRootProps {
  // Must have exactly two children.
  children: [ReactNode, ReactNode];
}

export enum LabelVariants {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  BOLD = 'bold',
  SUCCESS = 'success',
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

interface KeyValueRowTooltip {
  title: string;
  text: string;
  size?: ButtonIconSizes;
}

export interface KeyValueRowLabelProps {
  label: string;
  variant?: TextVariant;
  color?: TextColor;
  tooltip?: KeyValueRowTooltip;
}

export const IconSizes = AvatarSize;

export interface KeyValueSectionProps {
  children: ReactNode;
  direction?: SectionDirections;
  align?: SectionAlignments;
}

interface KeyValueRowIcon {
  src: ImageSourcePropType;
  name: string;
  isIpfsGatewayCheckBypassed?: boolean;
  size?: AvatarSize;
}

interface TextField {
  text: string;
  variant?: TextVariant;
  color?: TextColor;
  icon?: KeyValueRowIcon;
  tooltip?: KeyValueRowTooltip;
}

interface KeyValueRowText {
  textPrimary: TextField;
  textSecondary?: TextField;
}

export interface KeyValueRowProps {
  keyText: KeyValueRowText;
  valueText: KeyValueRowText;
}

export const TooltipSizes = ButtonIconSizes;
