import { JSXElement, GenericSnapElement, Text } from '@metamask/snaps-sdk/jsx';
import { hasChildren } from '@metamask/snaps-utils';
import { memoize } from 'lodash';
import { sha256 } from '@noble/hashes/sha256';
import {
  NonEmptyArray,
  bytesToHex,
  hasProperty,
  remove0x,
} from '@metamask/utils';
import { COMPONENT_MAPPING } from './components';
import { unescape as unescapeFn } from 'he';
import { FormState, InterfaceState, State } from '@metamask/snaps-sdk';
import { UIComponent } from './components/types';
import { Theme } from '../../../util/theme/models';

export interface MapToTemplateParams {
  map: Record<string, number>;
  element: JSXElement;
  form?: string;
  useFooter?: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
  t?: (key: string) => string;
  theme: Theme;
  size?: string;
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
      // TODO: Benchmark
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

/**
 * Extract and return first character (letter or number) of a provided string.
 * If not possible, return question mark.
 * Note: This function is used for generating fallback avatars for different entities (websites, Snaps, etc.)
 * Note: Only letters and numbers will be returned if possible (special characters are ignored).
 *
 * @param {string} subjectName - Name of a subject.
 * @returns Single character, chosen from the first character or number, question mark otherwise.
 */
export const getAvatarFallbackLetter = (subjectName?: string | null) =>
  subjectName?.match(/[a-z0-9]/iu)?.[0] ?? '?';

export const mapToTemplate = (params: MapToTemplateParams): UIComponent => {
  const { type, key } = params.element;
  const elementKey = key ?? generateKey(params.map, params.element);

  if (!hasProperty(COMPONENT_MAPPING, type)) {
    throw new Error(`Unknown component type: ${type}`);
  }

  const componentFn = COMPONENT_MAPPING[
    type as keyof typeof COMPONENT_MAPPING
  ] as (params: MapToTemplateParams) => UIComponent;
  const mapped = componentFn(params);
  return { ...mapped, key: elementKey } as UIComponent;
};

export const mapTextToTemplate = (
  elements: NonEmptyArray<JSXElement | string>,
  params: Pick<
    MapToTemplateParams,
    'map' | 'useFooter' | 'onCancel' | 'theme' | 'size' | 'textColor'
  >,
): NonEmptyArray<UIComponent | string> =>
  elements.map((e) => {
    if (typeof e === 'string') {
      const text = unescapeFn(e);
      const key = generateKey(params.map, Text({ children: text }));
      return {
        element: 'RNText',
        key,
        children: text,
        props: { color: params.textColor },
      };
    }

    return mapToTemplate({ ...params, element: e });
  }) as NonEmptyArray<UIComponent | string>;

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
export const mergeValue = <Type extends State>(
  state: InterfaceState,
  name: string,
  value: Type | null,
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

/**
 * Registry of element types that are used within Field element.
 */
export const FIELD_ELEMENT_TYPES = [
  'FileInput',
  'Input',
  'Dropdown',
  'RadioGroup',
  'Checkbox',
  'Selector',
];

/**
 * Search for the element that is considered to be primary child element of a Field.
 *
 * @param children - Children elements specified within Field element.
 * @returns Number, representing index of a primary field in the array of children elements.
 */
export const getPrimaryChildElementIndex = (children: JSXElement[]) =>
  children.findIndex((c) => FIELD_ELEMENT_TYPES.includes(c.type));

/**
 * Map Snap custom size for border radius to mobile compatible size.
 *
 * @param snapBorderRadius - Snap custom border radius.
 * @returns Number, representing border radius size used in mobile design system.
 */
export const mapSnapBorderRadiusToMobileBorderRadius = (
  snapBorderRadius: string | undefined,
): number => {
  switch (snapBorderRadius) {
    case 'none':
    default:
      return 0;
    case 'medium':
      return 6;
    case 'full':
      return 9999;
  }
};
