import { fireEvent, RenderResult } from '@testing-library/react-native';

// https://github.com/JesperLekland/react-native-svg-charts/issues/418

type Root = RenderResult['root'];

const _findByProp = function (root: Root, prop = '', found: Root[] = []) {
  if (!root) return found;

  if (root.props) {
    if (Object.keys(root.props).includes(prop)) found.push(root);
  }

  if (root.children?.length) {
    root.children.forEach((c) => {
      if (typeof c !== 'string') {
        _findByProp(c, prop, found);
      }
    });
  }

  return found;
};

// /**
//  * Find components in the given component hierarchy based
//  * on the name of one of their props. For example,
//  * `findByProp(root, 'foo')` will return a list of all
//  * components with a `foo` prop of any value.
//  */
const findByProp = function (
  /**
   * The root of the component tree to search through.
   */
  root: Root,
  /**
   * The name of the prop you are using to select components.
   */
  prop = '',
) {
  return _findByProp(root, prop);
};

export const fireLayoutEvent = function (
  /**
   * The root node to search for components with `onLayout` props.
   */
  root: Root,
  /**
   * The event options inside of `event.nativeElement.layout`
   */
  options = {
    width: 300,
    height: 100,
  },
) {
  findByProp(root, 'onLayout').forEach((n) =>
    fireEvent(n, 'layout', { nativeEvent: { layout: options } }),
  );
};
