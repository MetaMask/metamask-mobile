/* eslint-disable @typescript-eslint/no-shadow */
import { JSXElement, RowElement } from '@metamask/snaps-sdk/jsx';

import { mapToTemplate } from '../utils';
import { UIComponent, UIComponentFactory } from './types';
import { getJsxChildren } from '@metamask/snaps-utils';
import { NonEmptyArray } from '@metamask/utils';

export enum RowVariant {
  Default = 'default',
  Critical = 'critical',
  Warning = 'warning',
}

export const row: UIComponentFactory<RowElement> = ({
  element,
  ...params
}) => ({
  element: 'InfoRow',
  children: getJsxChildren(element).map((children) =>
    mapToTemplate({ ...params, element: children as JSXElement }),
  ) as NonEmptyArray<UIComponent>,
  props: {
    label: element.props.label,
    variant: element.props.variant,
    tooltip: element.props.tooltip,
    style: {
      paddingTop: 0,
      paddingBottom: 0,
      marginLeft: -8,
      marginRight: -8,
    },
  },
});
