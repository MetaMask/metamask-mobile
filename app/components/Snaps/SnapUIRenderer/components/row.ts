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

const getTextColorFromVariant = (variant?: string) => {
  switch (variant) {
    case RowVariant.Critical:
    case 'critical':
      return 'error';
    case RowVariant.Warning:
    case 'warning':
      return 'warning';
    default:
      return 'default';
  }
};

export const row: UIComponentFactory<RowElement> = ({
  element: e,
  ...params
}) => {
  const rowVariant = e.props.variant;
  const textColor = rowVariant
    ? getTextColorFromVariant(rowVariant)
    : undefined;

  const children = getJsxChildren(e);
  const processedChildren = children.map((child) => {
    if (typeof child === 'object' && child !== null && child.type === 'Text') {
      return mapToTemplate({
        ...params,
        element: {
          ...child,
          props: {
            ...child.props,
            color: child.props.color || textColor,
          },
        } as JSXElement,
      });
    }

    return mapToTemplate({ ...params, element: child as JSXElement });
  }) as NonEmptyArray<UIComponent>;

  return {
    element: 'SnapUIInfoRow',
    children: processedChildren,
    props: {
      label: e.props.label,
      variant: rowVariant,
      tooltip: e.props.tooltip,
      style: {
        paddingTop: 0,
        paddingBottom: 0,
        marginLeft: -8,
        marginRight: -8,
      },
    },
  };
};
