import React from 'react';
import { IconColor } from '../../../component-library/components/Icons/Icon';
import { TextColor } from '../../../component-library/components/Texts/Text';

export enum Display {
  Block = 'block',
  Grid = 'grid',
  InlineBlock = 'inline-block',
  Inline = 'inline',
  InlineFlex = 'inline-flex',
  InlineGrid = 'inline-grid',
  ListItem = 'list-item',
  None = 'none',
}

export enum BorderStyle {
  dashed = 'dashed',
  solid = 'solid',
  dotted = 'dotted',
  double = 'double',
  none = 'none',
}

export enum BorderColor {
  borderDefault = 'border-default',
  borderMuted = 'border-muted',
  primaryDefault = 'primary-default',
  primaryAlternative = 'primary-alternative',
  primaryMuted = 'primary-muted',
  errorDefault = 'error-default',
  errorAlternative = 'error-alternative',
  errorMuted = 'error-muted',
  warningDefault = 'warning-default',
  warningMuted = 'warning-muted',
  successDefault = 'success-default',
  successMuted = 'success-muted',
  infoDefault = 'info-default',
  infoMuted = 'info-muted',
  mainnet = 'mainnet',
  goerli = 'goerli',
  sepolia = 'sepolia',
  lineaGoerli = 'linea-goerli',
  lineaSepolia = 'linea-sepolia',
  lineaMainnet = 'linea-mainnet',
  transparent = 'transparent',
  localhost = 'localhost',
  backgroundDefault = 'background-default', // exception for border color when element is meant to look "cut out"
}

export type StyleDeclarationType =
  | 'margin'
  | 'margin-top'
  | 'margin-right'
  | 'margin-bottom'
  | 'margin-left'
  | 'margin-inline'
  | 'margin-inline-start'
  | 'margin-inline-end'
  | 'padding'
  | 'padding-top'
  | 'padding-right'
  | 'padding-bottom'
  | 'padding-left'
  | 'padding-inline'
  | 'padding-inline-start'
  | 'padding-inline-end'
  | 'display'
  | 'gap'
  | 'flex-direction'
  | 'flex-wrap'
  | 'justify-content'
  | 'align-items'
  | 'text-align'
  | 'width'
  | 'min-width'
  | 'height'
  | 'color'
  | 'background-color'
  | 'rounded'
  | 'border-style'
  | 'border-color'
  | 'border-width';

export enum JustifyContent {
  flexStart = 'flex-start',
  flexEnd = 'flex-end',
  center = 'center',
  spaceAround = 'space-around',
  spaceBetween = 'space-between',
  spaceEvenly = 'space-evenly',
}

export enum FlexDirection {
  Row = 'row',
  RowReverse = 'row-reverse',
  Column = 'column',
  ColumnReverse = 'column-reverse',
}

export enum AlignItems {
  flexStart = 'flex-start',
  flexEnd = 'flex-end',
  center = 'center',
  baseline = 'baseline',
  stretch = 'stretch',
}

export enum TextAlign {
  left = 'left',
  right = 'right',
  center = 'center',
}

export enum BlockSize {
  Zero = '0',
  Half = '1/2',
  OneThird = '1/3',
  TwoThirds = '2/3',
  OneFourth = '1/4',
  TwoFourths = '2/4',
  ThreeFourths = '3/4',
  OneFifth = '1/5',
  TwoFifths = '2/5',
  ThreeFifths = '3/5',
  FourFifths = '4/5',
  OneSixth = '1/6',
  TwoSixths = '2/6',
  ThreeSixths = '3/6',
  FourSixths = '4/6',
  FiveSixths = '5/6',
  OneTwelfth = '1/12',
  TwoTwelfths = '2/12',
  ThreeTwelfths = '3/12',
  FourTwelfths = '4/12',
  FiveTwelfths = '5/12',
  SixTwelfths = '6/12',
  SevenTwelfths = '7/12',
  EightTwelfths = '8/12',
  NineTwelfths = '9/12',
  TenTwelfths = '10/12',
  ElevenTwelfths = '11/12',
  Screen = 'screen',
  Max = 'max',
  Min = 'min',
  Full = 'full',
}

export enum Color {
  backgroundDefault = 'background-default',
  backgroundAlternative = 'background-alternative',
  backgroundMuted = 'background-muted',
  textDefault = 'text-default',
  textAlternative = 'text-alternative',
  textMuted = 'text-muted',
  iconDefault = 'icon-default',
  iconAlternative = 'icon-alternative',
  iconMuted = 'icon-muted',
  borderDefault = 'border-default',
  borderMuted = 'border-muted',
  overlayDefault = 'overlay-default',
  overlayInverse = 'overlay-inverse',
  primaryDefault = 'primary-default',
  primaryAlternative = 'primary-alternative',
  primaryMuted = 'primary-muted',
  primaryInverse = 'primary-inverse',
  errorDefault = 'error-default',
  errorAlternative = 'error-alternative',
  errorMuted = 'error-muted',
  errorInverse = 'error-inverse',
  warningDefault = 'warning-default',
  warningMuted = 'warning-muted',
  warningInverse = 'warning-inverse',
  successDefault = 'success-default',
  successMuted = 'success-muted',
  successInverse = 'success-inverse',
  infoDefault = 'info-default',
  infoMuted = 'info-muted',
  infoInverse = 'info-inverse',
  mainnet = 'mainnet',
  goerli = 'goerli',
  sepolia = 'sepolia',
  lineaGoerli = 'linea-goerli',
  lineaGoerliInverse = 'linea-goerli-inverse',
  lineaSepolia = 'linea-sepolia',
  lineaSepoliaInverse = 'linea-sepolia-inverse',
  lineaMainnet = 'linea-mainnet',
  lineaMainnetInverse = 'linea-mainnet-inverse',
  transparent = 'transparent',
  localhost = 'localhost',
  inherit = 'inherit',
  goerliInverse = 'goerli-inverse',
  sepoliaInverse = 'sepolia-inverse',
}

export enum BackgroundColor {
  backgroundDefault = 'background-default',
  backgroundAlternative = 'background-alternative',
  backgroundMuted = 'background-muted',
  backgroundAlternativeSoft = 'background-alternative-soft',
  backgroundHover = 'background-hover',
  backgroundPressed = 'background-pressed',
  iconDefault = 'icon-default',
  iconAlternative = 'icon-alternative',
  iconMuted = 'icon-muted',
  overlayDefault = 'overlay-default',
  overlayAlternative = 'overlay-alternative',
  primaryDefault = 'primary-default',
  primaryAlternative = 'primary-alternative',
  primaryMuted = 'primary-muted',
  errorDefault = 'error-default',
  errorAlternative = 'error-alternative',
  errorMuted = 'error-muted',
  warningDefault = 'warning-default',
  warningMuted = 'warning-muted',
  successDefault = 'success-default',
  successMuted = 'success-muted',
  infoDefault = 'info-default',
  infoMuted = 'info-muted',
  mainnet = 'mainnet',
  goerli = 'goerli',
  sepolia = 'sepolia',
  lineaGoerli = 'linea-goerli',
  lineaSepolia = 'linea-sepolia',
  lineaMainnet = 'linea-mainnet',
  transparent = 'transparent',
  localhost = 'localhost',
}

export enum BorderRadius {
  /**
   * 2px
   */
  XS = 'xs',
  /**
   * 4px
   */
  SM = 'sm',
  /**
   * 6px
   */
  MD = 'md',
  /**
   * 8px
   */
  LG = 'lg',
  /**
   * 12px
   */
  XL = 'xl',
  /**
   * 0
   */
  none = 'none',
  /**
   * 9999px
   */
  pill = 'pill',
  /**
   * 50%
   */
  full = 'full',
}

export enum FlexWrap {
  Wrap = 'wrap',
  WrapReverse = 'wrap-reverse',
  NoWrap = 'nowrap',
}

export type StylePropValueType =
  | AlignItems
  | AlignItemsArray
  | BackgroundColor
  | BackgroundColorArray
  | BlockSize
  | BlockSizeArray
  | BorderColor
  | BorderColorArray
  | BorderRadius
  | BorderRadiusArray
  | BorderStyle
  | BorderStyleArray
  | Color
  | Display
  | DisplayArray
  | FlexDirection
  | FlexDirectionArray
  | FlexWrap
  | FlexWrapArray
  | IconColor
  | JustifyContent
  | JustifyContentArray
  | SizeNumberAndAuto
  | SizeNumberAndAutoArray
  | TextAlign
  | TextAlignArray
  | TextColor
  | TextColorArray
  | IconColorArray
  | undefined;

export interface ClassNamesObject {
  // TODO: Replace `any` with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export type FlexDirectionArray = [
  FlexDirection,
  FlexDirection?,
  FlexDirection?,
  FlexDirection?,
];
export type FlexWrapArray = [FlexWrap, FlexWrap?, FlexWrap?, FlexWrap?];
export type TextAlignArray = [TextAlign, TextAlign?, TextAlign?, TextAlign?];
export type DisplayArray = [Display, Display?, Display?, Display?];
export type BlockSizeArray = [BlockSize, BlockSize?, BlockSize?, BlockSize?];

export type SizeNumber =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | null;

export type SizeNumberArray = [
  SizeNumber,
  SizeNumber?,
  SizeNumber?,
  SizeNumber?,
];

export type SizeNumberAndAuto = SizeNumber | 'auto';

export type SizeNumberAndAutoArray = [
  SizeNumberAndAuto,
  SizeNumberAndAuto?,
  SizeNumberAndAuto?,
  SizeNumberAndAuto?,
];

export type BorderColorArray = [
  BorderColor,
  BorderColor?,
  BorderColor?,
  BorderColor?,
];

export type BorderRadiusArray = [
  BorderRadius,
  BorderRadius?,
  BorderRadius?,
  BorderRadius?,
];

export type BorderStyleArray = [
  BorderStyle,
  BorderStyle?,
  BorderStyle?,
  BorderStyle?,
];

export type AlignItemsArray = [
  AlignItems,
  AlignItems?,
  AlignItems?,
  AlignItems?,
];

export type JustifyContentArray = [
  JustifyContent,
  JustifyContent?,
  JustifyContent?,
  JustifyContent?,
];

export type BackgroundColorArray = [
  BackgroundColor,
  BackgroundColor?,
  BackgroundColor?,
  BackgroundColor?,
];

export type TextColorArray = [TextColor, TextColor?, TextColor?, TextColor?];

export type IconColorArray = [IconColor, IconColor?, IconColor?, IconColor?];

/**
 * Polymorphic props based on Ohans Emmanuel's article below
 * https://blog.logrocket.com/build-strongly-typed-polymorphic-components-react-typescript/#ensuring-as-prop-only-receives-valid-html-element-strings
 */

/**
 * Uses generic type C to create polymorphic ref type
 */
export type PolymorphicRef<C extends React.ElementType> =
  React.ComponentPropsWithRef<C>['ref'];

/**
 * Uses generic type C to define the type for the polymorphic "as" prop
 * "as" can be used to override the default HTML element
 */
interface AsProp<C extends React.ElementType> {
  /**
   * An override of the default HTML tag.
   * Can also be a React component.
   */
  as?: C;
}

/**
 * Omits the as prop and props from component definition
 */
type PropsToOmit<C extends React.ElementType, P> = keyof (AsProp<C> & P);

/**
 * Accepts 2 generic types: C which represents the as prop and the component props - Props
 */
type PolymorphicComponentProp<
  C extends React.ElementType,
  // eslint-disable-next-line @typescript-eslint/ban-types
  Props = {},
> = React.PropsWithChildren<Props & AsProp<C>> &
  Omit<React.ComponentPropsWithoutRef<C>, PropsToOmit<C, Props>>;

export type PolymorphicComponentPropWithRef<
  C extends React.ElementType,
  // eslint-disable-next-line @typescript-eslint/ban-types
  Props = {},
> = PolymorphicComponentProp<C, Props> & { ref?: PolymorphicRef<C> };

/**
 * Includes all style utility props. This should be used to extend the props of a component.
 */
export interface StyleUtilityProps {
  /**
   * The flex direction of the component.
   * Use the FlexDirection enum from '../../../helpers/constants/design-system';
   * Accepts responsive props in the form of an array.
   */
  flexDirection?: FlexDirection | FlexDirectionArray;
  /**
   * The flex wrap of the component.
   * Use the FlexWrap enum from '../../../helpers/constants/design-system';
   * Accepts responsive props in the form of an array.
   */
  flexWrap?: FlexWrap | FlexWrapArray;
  /**
   * The gap between the component's children.
   * Use 1-12 for a gap of 4px-48px.
   * Accepts responsive props in the form of an array.
   */
  gap?: SizeNumber | SizeNumberArray | undefined;
  /**
   * The margin of the component.
   * Use 1-12 for 4px-48px or 'auto'.
   * Accepts responsive props in the form of an array.
   */
  margin?: SizeNumberAndAuto | SizeNumberAndAutoArray;
  /**
   * The margin-top of the component.
   * Use 1-12 for 4px-48px or 'auto'.
   * Accepts responsive props in the form of an array.
   */
  marginTop?: SizeNumberAndAuto | SizeNumberAndAutoArray;
  /**
   * The margin-bottom of the component.
   * Use 1-12 for 4px-48px or 'auto'.
   * Accepts responsive props in the form of an array.
   */
  marginBottom?: SizeNumberAndAuto | SizeNumberAndAutoArray;
  /**
   * The margin-right of the component.
   * Use 1-12 for 4px-48px or 'auto'.
   * Accepts responsive props in the form of an array.
   */
  marginRight?: SizeNumberAndAuto | SizeNumberAndAutoArray;
  /**
   * The margin-left of the component.
   * Use 1-12 for 4px-48px or 'auto'.
   * Accepts responsive props in the form of an array.
   */
  marginLeft?: SizeNumberAndAuto | SizeNumberAndAutoArray;
  /**
   * The margin-inline of the component.
   * Use 1-12 for 4px-48px or 'auto'.
   * Accepts responsive props in the form of an array.
   */
  marginInline?: SizeNumberAndAuto | SizeNumberAndAutoArray;
  /**
   * The margin-inline-start of the component.
   * Use 1-12 for 4px-48px or 'auto'.
   * Accepts responsive props in the form of an array.
   */
  marginInlineStart?: SizeNumberAndAuto | SizeNumberAndAutoArray;
  /**
   * The margin-inline-end of the component.
   * Use 1-12 for 4px-48px or 'auto'.
   * Accepts responsive props in the form of an array.
   */
  marginInlineEnd?: SizeNumberAndAuto | SizeNumberAndAutoArray;
  /**
   * The padding of the component.
   * Use 1-12 for 4px-48px.
   * Accepts responsive props in the form of an array.
   */
  padding?: SizeNumber | SizeNumberArray;
  /**
   * The padding-top of the component.
   * Use 1-12 for 4px-48px.
   * Accepts responsive props in the form of an array.
   */
  paddingTop?: SizeNumber | SizeNumberArray;
  /**
   * The padding-bottom of the component.
   * Use 1-12 for 4px-48px.
   * Accepts responsive props in the form of an array.
   */
  paddingBottom?: SizeNumber | SizeNumberArray;
  /**
   * The padding-right of the component.
   * Use 1-12 for 4px-48px.
   * Accepts responsive props in the form of an array.
   */
  paddingRight?: SizeNumber | SizeNumberArray;
  /**
   * The padding-left of the component.
   * Use 1-12 for 4px-48px.
   * Accepts responsive props in the form of an array.
   */
  paddingLeft?: SizeNumber | SizeNumberArray;
  /**
   * The padding-inline of the component.
   * Use 1-12 for 4px-48px.
   * Accepts responsive props in the form of an array.
   */
  paddingInline?: SizeNumber | SizeNumberArray;
  /**
   * The padding-inline-start of the component.
   * Use 1-12 for 4px-48px.
   * Accepts responsive props in the form of an array.
   */
  paddingInlineStart?: SizeNumber | SizeNumberArray;
  /**
   * The padding-inline-end of the component.
   * Use 1-12 for 4px-48px.
   * Accepts responsive props in the form of an array.
   */
  paddingInlineEnd?: SizeNumber | SizeNumberArray;
  /**
   * The border-color of the component.
   * Use BorderColor enum from '../../../helpers/constants/design-system';
   * Accepts responsive props in the form of an array.
   */
  borderColor?: BorderColor | BorderColorArray;
  /**
   * The border-width of the component.
   * Use 1-12 for 1px-12px.
   * Accepts responsive props in the form of an array.
   */
  borderWidth?: SizeNumber | SizeNumberArray;
  /**
   * The border-radius of the component.
   * Use BorderRadius enum from '../../../helpers/constants/design-system';
   * Accepts responsive props in the form of an array.
   */
  borderRadius?: BorderRadius | BorderRadiusArray;
  /**
   * The border-style of the component.
   * Use BorderStyle enum from '../../../helpers/constants/design-system';
   * Accepts responsive props in the form of an array.
   */
  borderStyle?: BorderStyle | BorderStyleArray;
  /**
   * The align-items of the component.
   * Use AlignItems enum from '../../../helpers/constants/design-system';
   * Accepts responsive props in the form of an array.
   */
  alignItems?: AlignItems | AlignItemsArray;
  /**
   * The justify-content of the component.
   * Use JustifyContent enum from '../../../helpers/constants/design-system';
   * Accepts responsive props in the form of an array.
   */
  justifyContent?: JustifyContent | JustifyContentArray;
  /**
   * The text-align of the component.
   * Use TextAlign enum from '../../../helpers/constants/design-system';
   * Accepts responsive props in the form of an array.
   */
  textAlign?: TextAlign | TextAlignArray;
  /**
   * The display of the component.
   * Use Display enum from '../../../helpers/constants/design-system';
   * Accepts responsive props in the form of an array.
   */
  display?: Display | DisplayArray;
  /**
   * The width of the component.
   * Use BlockSize enum from '../../../helpers/constants/design-system';
   * Accepts responsive props in the form of an array.
   */
  width?: BlockSize | BlockSizeArray;
  /**
   * The min-width of the component.
   * Use BlockSize enum from '../../../helpers/constants/design-system';
   * Accepts responsive props in the form of an array.
   */
  minWidth?: BlockSize | BlockSizeArray;
  /**
   * The height of the component.
   * Use BlockSize enum from '../../../helpers/constants/design-system';
   * Accepts responsive props in the form of an array.
   */
  height?: BlockSize | BlockSizeArray;
  /**
   * The background-color of the component.
   * Use BackgroundColor enum from '../../../helpers/constants/design-system';
   * Accepts responsive props in the form of an array.
   */
  backgroundColor?: BackgroundColor | BackgroundColorArray;
  /**
   * The text-color of the component.
   * Use TextColor enum from '../../../helpers/constants/design-system';
   * Accepts responsive props in the form of an array.
   */
  color?: TextColor | TextColorArray | IconColor | IconColorArray;
  /**
   * An optional data-testid to apply to the component.
   * TypeScript is complaining about data- attributes which means we need to explicitly define this as a prop.
   * TODO: Allow data- attributes.
   */
  'data-testid'?: string;
}
/**
 * Box component props.
 */
// TODO: Convert to a `type` in a future major version.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface Props extends StyleUtilityProps {
  /**
   * The content of the Box component.
   */
  children?: React.ReactNode;
  /**
   * Additional className to apply to the Box component.
   */
  className?: string;
}

export type BoxProps<C extends React.ElementType> =
  PolymorphicComponentPropWithRef<C, Props>;

export type BoxComponent = <C extends React.ElementType = 'span'>(
  props: BoxProps<C>,
) => React.ReactElement | null;
