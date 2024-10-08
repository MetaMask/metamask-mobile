/* eslint-disable @typescript-eslint/no-shadow */
import { JSXElement, RowElement } from '@metamask/snaps-sdk/jsx';

import { mapToTemplate } from '../utils';
import { UIComponent, UIComponentFactory } from './types';
import { getJsxChildren } from '@metamask/snaps-utils';
import { NonEmptyArray } from '@metamask/utils';
import { ViewProps } from 'react-native';

export const row: UIComponentFactory<RowElement> = ({
  element,
  ...params
}) => ({
  element: 'Row',
  children: getJsxChildren(element).map((children) =>
    mapToTemplate({ ...params, element: children as JSXElement }),
  ) as NonEmptyArray<UIComponent>,
  props: {
    label: element.props.label,
    variant: element.props.variant,
    tooltip: element.props.tooltip,
    ...element.props as ViewProps,
  },
});
