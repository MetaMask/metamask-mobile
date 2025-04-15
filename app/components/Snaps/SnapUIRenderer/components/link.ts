import { LinkElement, JSXElement } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { NonEmptyArray } from '@metamask/utils';
import { mapTextToTemplate } from '../utils';
import { UIComponentFactory } from './types';

export const link: UIComponentFactory<LinkElement> = ({
  element: e,
  ...params
}) => {
  const linkColor = params.theme.colors.info.default;

  const processedChildren = getJsxChildren(e).map((child) => {
    if (typeof child === 'string') {
      return child;
    }

    if (typeof child === 'object' && 'type' in child && child.type === 'Icon') {
      return {
        ...child,
        props: {
          ...child.props,
          color: 'primary',
        },
      };
    }

    return child;
  });

  return {
    element: 'SnapUILink',
    children: mapTextToTemplate(
      processedChildren as NonEmptyArray<string | JSXElement>,
      { ...params, textColor: linkColor },
    ),
    props: {
      href: e.props.href,
    },
  };
};
