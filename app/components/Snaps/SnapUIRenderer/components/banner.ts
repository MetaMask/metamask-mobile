import { BannerElement, JSXElement } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { mapToTemplate } from '../utils';
import { UIComponentFactory } from './types';

function transformSeverity(
  severity: BannerElement['props']['severity'],
): string {
  if (severity === 'danger') {
    return 'Error';
  }

  return severity?.charAt(0).toUpperCase() + severity?.slice(1);
}

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
    severity: transformSeverity(e.props.severity),
  },
});
