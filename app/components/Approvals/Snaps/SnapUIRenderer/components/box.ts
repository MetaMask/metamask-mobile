/* eslint-disable @typescript-eslint/no-shadow */
import { BoxElement, JSXElement, BoxProps } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { NonEmptyArray } from '@metamask/utils';
import { TextColor } from '../../../../../component-library/components/Texts/Text';
import { mapToTemplate, Display, FlexDirection } from '../utils';
import { UIComponent, UIComponentFactory } from './types';
import { ViewStyle, ViewProps } from 'react-native';

function generateJustifyContent(
  alignment?: BoxProps['alignment'],
): ViewStyle['justifyContent'] {
  switch (alignment) {
    default:
    case 'start':
      return 'flex-start';

    case 'center':
      return 'center';

    case 'end':
      return 'flex-end';

    case 'space-between':
      return 'space-between';

    case 'space-around':
      return 'space-around';
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
    display: Display.Flex,
    flexDirection:
      element.props.direction === 'horizontal'
        ? FlexDirection.Row
        : FlexDirection.Column,
    justifyContent: generateJustifyContent(element.props.alignment),
    color: TextColor.Default,
    ...(element.props as ViewProps),
  },
});
