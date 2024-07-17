import { JSXElement, GenericSnapElement } from '@metamask/snaps-sdk/jsx';
import { hasChildren } from '@metamask/snaps-utils';
import { memoize } from 'lodash';
import { sha256 } from '@noble/hashes/sha256';
import { NonEmptyArray, bytesToHex, remove0x } from '@metamask/utils';
import { unescape as unescapeEntities } from 'he';
import { COMPONENT_MAPPING } from './components';
import { UIComponent } from './components/types';

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
  const mapped = COMPONENT_MAPPING[
    type as Exclude<JSXElement['type'], 'Option'>
    // TODO: Replace `any` with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ](params as any);
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
