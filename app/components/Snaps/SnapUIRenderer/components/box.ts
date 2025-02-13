import { BoxElement, JSXElement, BoxProps } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { NonEmptyArray } from '@metamask/utils';
import { mapToTemplate } from '../utils';
import { UIComponent, UIComponentFactory } from './types';
import { TextColor } from '../../../../component-library/components/Texts/Text/Text.types';
import { AlignItems, FlexDirection, JustifyContent } from './box.types';

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
    alignItems: e.props.center && AlignItems.center,
    color: TextColor.Default,
  },
});
