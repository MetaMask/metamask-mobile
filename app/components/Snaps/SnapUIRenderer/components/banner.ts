import { BannerElement, JSXElement } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { mapToTemplate } from '../utils';
import { UIComponentFactory } from './types';

export const banner: UIComponentFactory<BannerElement> = ({
  element: e,
  ...params
}) => ({
  element: 'SnapUIBanner',
  children: getJsxChildren(e).map((children) =>
    mapToTemplate({ element: children as JSXElement, ...params }),
  ),
  props: {
    title: e.props.title,
    severity:
      e.props.severity?.charAt(0).toUpperCase() + e.props.severity?.slice(1),
  },
});
