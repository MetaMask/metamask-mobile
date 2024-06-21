import { LinkElement, JSXElement } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { NonEmptyArray } from '@metamask/utils';
import { mapTextToTemplate } from '../utils';
import { UIComponentFactory } from './types';

export const link: UIComponentFactory<LinkElement> = ({
  element,
  ...params
}) => ({
  element: 'Text', // TODO: Use proper component
  children: mapTextToTemplate(
    getJsxChildren(element) as NonEmptyArray<string | JSXElement>,
    params,
  ),
  props: {
    href: element.props.href,
  },
});
