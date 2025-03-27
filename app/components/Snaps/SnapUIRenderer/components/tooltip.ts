import { JSXElement, Text, TooltipElement } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { mapToTemplate } from '../utils';
import { UIComponentFactory } from './types';

export const tooltip: UIComponentFactory<TooltipElement> = ({
  element: e,
  ...params
}) => ({
  element: 'SnapUITooltip',
  children: getJsxChildren(e).map((children) =>
    mapToTemplate({ element: children as JSXElement, ...params }),
  ),
  propComponents: {
    content: mapToTemplate({
      element:
        typeof e.props.content === 'string'
          ? Text({ children: e.props.content })
          : e.props.content,
      ...params,
    }),
  },
});
