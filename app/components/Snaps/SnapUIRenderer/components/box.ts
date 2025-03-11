import { BoxElement, JSXElement, BoxProps } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { NonEmptyArray } from '@metamask/utils';
import { mapToTemplate } from '../utils';
import { UIComponent, UIComponentFactory } from './types';
import { TextColor } from '../../../../component-library/components/Texts/Text/Text.types';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../UI/Box/box.types';

function generateJustifyContent(alignment?: BoxProps['alignment']) {
  switch (alignment) {
    default:
    case 'start':
      return JustifyContent.flexStart;

    case 'center':
      return JustifyContent.center;

    case 'end':
      return JustifyContent.flexEnd;

    case 'space-between':
      return JustifyContent.spaceBetween;

    case 'space-around':
      return JustifyContent.spaceAround;
  }
}

function generateAlignItems(
  crossAlignment: BoxProps['crossAlignment'],
  center?: BoxProps['center'],
) {
  if (center) {
    return AlignItems.center;
  }

  switch (crossAlignment) {
    default:
      return undefined;

    case 'start':
      return AlignItems.flexStart;

    case 'center':
      return AlignItems.center;

    case 'end':
      return AlignItems.flexEnd;
  }
}

export const box: UIComponentFactory<BoxElement> = ({
  element: e,
  ...params
}) => ({
  element: 'Box',
  children: getJsxChildren(e).map((children) =>
    mapToTemplate({ ...params, element: children as JSXElement }),
  ) as NonEmptyArray<UIComponent>,
  props: {
    flexDirection:
      e.props.direction === 'horizontal'
        ? FlexDirection.Row
        : FlexDirection.Column,
    justifyContent: generateJustifyContent(e.props.alignment),
    alignItems: generateAlignItems(e.props.crossAlignment, e.props.center),
    color: TextColor.Default,
    gap: 8,
  },
});
