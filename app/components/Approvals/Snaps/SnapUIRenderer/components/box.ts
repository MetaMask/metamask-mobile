import { BoxElement, JSXElement, BoxProps } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { NonEmptyArray } from '@metamask/utils';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
  mapToTemplate,
} from '../utils';
import { UIComponent, UIComponentFactory } from './types';
import { TextColor } from '../../../../../component-library/components/Texts/Text/Text.types';

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

export const box: UIComponentFactory<BoxElement> = ({
  element,
  ...params
}) => ({
  element: 'Box',
  children: getJsxChildren(element).map((children) =>
    mapToTemplate({ ...params, element: children as JSXElement }),
  ) as NonEmptyArray<UIComponent>,
  props: {
    flexDirection:
      element.props.direction === 'horizontal'
        ? FlexDirection.Row
        : FlexDirection.Column,
    justifyContent: generateJustifyContent(element.props.alignment),
    alignItems: element.props.center && AlignItems.center,
    color: TextColor.Default,
  },
});
