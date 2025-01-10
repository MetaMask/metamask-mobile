/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent } from '@testing-library/react-native';

/**
 * Purpose: This file is used to test react-native-svg-charts components
 *
 * Why this is needed: react-native-svg-charts components listen for onLayout changes before they render any data.
 * For these components to render, you need to trigger these event handlers for each component in your tests.
 */

// File Source: https://github.com/JesperLekland/react-native-svg-charts/issues/418
function _findByProp(root: any, prop = '', found: any[] = []) {
  if (!root) return found;

  if (root.props) {
    if (Object.keys(root.props).includes(prop)) found.push(root);
  }

  if (root.children?.length) {
    root.children.forEach((c: any) => _findByProp(c, prop, found));
  }

  return found;
}

/**
 * Find components in the given component hierarchy based
 * on the name of one of their props. For example,
 * `findByProp(root, 'foo')` will return a list of all
 * components with a `foo` prop of any value.
 */
export function findByProp(
  /**
   * The root of the component tree to search through.
   */
  root: any,
  /**
   * The name of the prop you are using to select components.
   */
  prop = '',
) {
  return _findByProp(root, prop);
}

/**
 * Fire the same layout event for all components that have
 * an `onLayout` prop. Generally you won't want to do this because
 * the layout dimensions would be different for each component.
 * However, this can be useful if you don't have a way to determine
 * which components should receive specific dimensions.
 */
export function fireLayoutEvent(
  /**
   * The root node to search for components with `onLayout` props.
   */
  root: any,
  /**
   * The event options inside of `event.nativeElement.layout`
   */
  options = {
    width: 0,
    height: 0,
  },
) {
  findByProp(root, 'onLayout').forEach((n) =>
    fireEvent(n, 'layout', { nativeEvent: { layout: options } }),
  );
}
