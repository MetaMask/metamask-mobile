import { LinkElement, JSXElement } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { NonEmptyArray } from '@metamask/utils';
import { mapTextToTemplate } from '../utils';
import { UIComponentFactory } from './types';

export const link: UIComponentFactory<LinkElement> = ({
  element: e,
  ...params
}) => ({
  element: 'SnapUILink',
  children: mapTextToTemplate(
    getJsxChildren(e) as NonEmptyArray<string | JSXElement>,
    { ...params, textColor: params.theme.colors.info.default },
  ),
  props: {
    href: e.props.href,
  },
});
