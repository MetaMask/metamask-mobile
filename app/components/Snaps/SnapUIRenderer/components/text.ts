import { JSXElement, TextElement } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { NonEmptyArray } from '@metamask/utils';
import { mapTextToTemplate } from '../utils';
import { UIComponentFactory } from './types';
import {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text/Text.types';

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
      return null;
  }
}

function getFontWeight(color: TextElement['props']['fontWeight']) {
  switch (color) {
    case 'bold':
      return 'bold';
    case 'medium':
      return 'medium';
    case 'regular':
    default:
      return 'normal';
  }
}

function alignText(alignment: TextElement['props']['alignment']) {
  switch (alignment) {
    case 'start':
      return 'left';
    case 'center':
      return 'center';
    case 'end':
      return 'right';
    default:
      return 'left';
  }
};

function getTextVariant(size: TextElement['props']['size'], inheritedVariant?: string) {
  switch (size) {
    case 'md':
      return TextVariant.BodyMD;
    case 'sm':
      return TextVariant.BodySM;
    default:
      return inheritedVariant ?? TextVariant.BodyMD;
  }
}

export const text: UIComponentFactory<TextElement> = ({
  element: e,
  ...params
}) => ({
  element: 'Text',
  children: mapTextToTemplate(
    getJsxChildren(e) as NonEmptyArray<string | JSXElement>,
    {
      textSize: e.props.size,
      ...params,
    },
  ),
  props: {
    variant: getTextVariant(e.props.size, params.textVariant),
    fontWeight: getFontWeight(e.props.fontWeight),
    color: getTextColor(e.props.color) ?? params.textColor,
    textAlign: alignText(e.props.alignment),
  },
});
