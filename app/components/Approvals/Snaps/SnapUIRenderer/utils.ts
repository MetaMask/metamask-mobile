import { JSXElement, GenericSnapElement } from '@metamask/snaps-sdk/jsx';
import { hasChildren } from '@metamask/snaps-utils';
import { memoize } from 'lodash';
import { sha256 } from '@noble/hashes/sha256';
import { NonEmptyArray, bytesToHex, remove0x } from '@metamask/utils';
import { unescape as unescapeEntities } from 'he';
import { COMPONENT_MAPPING } from './components';
import { UIComponent } from './components/types';

const colors = Theme.colors;

export interface MapToTemplateParams {
  map: Record<string, number>;
  element: JSXElement;
  form?: string;
}

/**
 * Get a truncated version of component children to use in a hash.
 *
 * @param component - The component.
 * @returns A truncated version of component children to use in a hash.
 */
function getChildrenForHash(component: JSXElement) {
  if (!hasChildren(component)) {
    return null;
  }

  const { children } = component.props;

  if (typeof children === 'string') {
    // For the hash we reduce long strings
    return children.slice(0, 5000);
  }

  if (Array.isArray(children)) {
    // For arrays of children we just use the types
    return (children as GenericSnapElement[]).map((child) => ({
      type: child?.type ?? null,
    }));
  }

  return children;
}

/**
 * A memoized function for generating a hash that represents a Snap UI component.
 *
 * This can be used to generate React keys for components.
 *
 * @param component - The component.
 * @returns A hash as a string.
 */
const generateHash = memoize((component: JSXElement) => {
  const { type, props } = component;
  const { name } = props as { name?: string };
  const children = getChildrenForHash(component);
  return remove0x(
    bytesToHex(
      sha256(
        JSON.stringify({
          type,
          name: name ?? null,
          children,
        }),
      ),
    ),
  );
});

/**
 * Generate a React key to be used for a Snap UI component.
 *
 * This function also handles collisions between duplicate keys.
 *
 * @param map - A map of previously used keys to be used for collision handling.
 * @param component - The component.
 * @returns A key.
 */
function generateKey(
  map: Record<string, number>,
  component: JSXElement,
): string {
  const hash = generateHash(component);
  const count = (map[hash] ?? 0) + 1;
  map[hash] = count;
  return `${hash}_${count}`;
}

export const mapToTemplate = (params: MapToTemplateParams): UIComponent => {
  const { type, key } = params.element;
  const elementKey = key ?? generateKey(params.map, params.element);
  const mapped = COMPONENT_MAPPING[type as keyof typeof COMPONENT_MAPPING](
    params as any,
  );
  return { ...mapped, key: elementKey } as UIComponent;
};

export const mapTextToTemplate = (
  elements: NonEmptyArray<JSXElement | string>,
  params: Pick<MapToTemplateParams, 'map'>,
): NonEmptyArray<UIComponent | string> =>
  elements.map((element) => {
    // With the introduction of JSX elements here can be strings.
    if (typeof element === 'string') {
      // We unescape HTML entities here, to allow usage of &bull; etc.
      return unescapeEntities(element);
    }

    return mapToTemplate({ ...params, element });
  }) as NonEmptyArray<UIComponent | string>;

import { FormState, InterfaceState } from '@metamask/snaps-sdk';

/**
 * Merge a new input value in the interface state.
 *
 * @param state - The current interface state.
 * @param name - The input name.
 * @param value - The input value.
 * @param form - The name of the form containing the input.
 * Optional if the input is not contained in a form.
 * @returns The interface state with the new value merged in.
 */
export const mergeValue = (
  state: InterfaceState,
  name: string,
  value: string | null,
  form?: string,
): InterfaceState => {
  if (form) {
    return {
      ...state,
      [form]: {
        ...(state[form] as FormState),
        [name]: value,
      },
    };
  }
  return { ...state, [name]: value };
};

export enum TextWrap {
  BreakWord = 'break-word',
  Clip = 'clip',
  TailEllipsis = 'tail',
  MiddleEllipsis = 'middle',
  HeadEllipsis = 'head',
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

export enum Display {
  Block = 'block',
  Flex = 'flex',
  Grid = 'grid',
  InlineBlock = 'inline-block',
  Inline = 'inline',
  InlineFlex = 'inline-flex',
  InlineGrid = 'inline-grid',
  ListItem = 'list-item',
  None = 'none',
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

export enum BorderColor {
  borderDefault = colors.border.default,
  borderMuted = colors.border.muted,
  primaryDefault = colors.primary.default,
  primaryAlternative = colors.primary.alternative,
  primaryMuted = colors.primary.muted,
  errorDefault = colors.error.default,
  errorAlternative = colors.error.alternative,
  errorMuted = colors.error.muted,
  warningDefault = colors.warning.default,
  warningMuted = colors.warning.muted,
  successDefault = colors.success.default,
  successMuted = colors.success.muted,
  infoDefault = colors.info.default,
  infoMuted = colors.info.muted,
  mainnet = colors.network.mainnet,
  goerli = colors.network.goerli,
  sepolia = colors.network.sepolia,
  lineaGoerli = colors.network.lineaGoerli,
  lineaSepolia = colors.network.lineaSepolia,
  lineaMainnet = colors.network.lineaMainnet,
  transparent = 'transparent',
  localhost = colors.network.localhost,
  backgroundDefault = colors.background.default,
}
