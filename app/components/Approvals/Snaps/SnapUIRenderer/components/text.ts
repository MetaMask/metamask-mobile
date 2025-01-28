import { JSXElement, TextElement } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { NonEmptyArray } from '@metamask/utils';
import { mapTextToTemplate } from '../utils';
import { UIComponentFactory } from './types';
import {
  FontWeight,
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text/Text.types';

function getTextColor(color: TextElement['props']['color']) {
  switch (color) {
    case 'default':
      return TextColor.Default;
    case 'alternative':
      return TextColor.Alternative;
    case 'muted':
      return TextColor.Muted;
    case 'error':
      return TextColor.Error;
    case 'success':
      return TextColor.Success;
    case 'warning':
      return TextColor.Warning;
    default:
      return TextColor.Default;
  }
}

function getFontWeight(color: TextElement['props']['fontWeight']) {
  switch (color) {
    case 'bold':
      return FontWeight.Bold;
    case 'medium':
      return FontWeight.Medium;
    case 'regular':
    default:
      return FontWeight.Normal;
  }
}

export const text: UIComponentFactory<TextElement> = ({
  element,
  ...params
}) => {
  return {
    element: 'Text',
    children: mapTextToTemplate(
      getJsxChildren(element) as NonEmptyArray<string | JSXElement>,
      params,
    ),
    props: {
      variant:
        element.props.size === 'sm' ? TextVariant.BodySM : TextVariant.BodyMD,
      fontWeight: getFontWeight(element.props.fontWeight),
      color: getTextColor(element.props.color),
      className: 'snap-ui-renderer__text',
      textAlign: element.props.alignment || 'left',
    },
  };
};
