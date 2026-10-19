import { JSXElement, TextElement } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { NonEmptyArray } from '@metamask/utils';
import {
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { mapTextToTemplate } from '../utils';
import { UIComponentFactory } from './types';

function getTextColor(color: TextElement['props']['color']) {
  switch (color) {
    case 'default':
      return TextColor.TextDefault;
    case 'alternative':
      return TextColor.TextAlternative;
    case 'muted':
      return TextColor.TextMuted;
    case 'error':
      return TextColor.ErrorDefault;
    case 'success':
      return TextColor.SuccessDefault;
    case 'warning':
      return TextColor.WarningDefault;
    default:
      return null;
  }
}

function getFontWeight(
  fontWeight: TextElement['props']['fontWeight'],
  inheritedWeight?: string,
) {
  switch (fontWeight ?? inheritedWeight) {
    case FontWeight.Bold:
      return FontWeight.Bold;
    case FontWeight.Medium:
      return FontWeight.Medium;
    case FontWeight.Regular:
    default:
      return FontWeight.Regular;
  }
}

function getTextAlignment(
  alignment: TextElement['props']['alignment'],
  inheritedAlignment?: string,
) {
  switch (alignment) {
    case 'start':
      return 'left';
    case 'center':
      return 'center';
    case 'end':
      return 'right';
    default:
      return inheritedAlignment ?? 'left';
  }
}

function getTextVariant(
  size: TextElement['props']['size'],
  inheritedVariant?: string,
) {
  switch (size) {
    case 'md':
      return TextVariant.BodyMd;
    case 'sm':
      return TextVariant.BodySm;
    default:
      return inheritedVariant ?? TextVariant.BodyMd;
  }
}

export const text: UIComponentFactory<TextElement> = ({
  element: e,
  ...params
}) => {
  const textColor = getTextColor(e.props.color) ?? params.textColor;
  const textVariant = getTextVariant(e.props.size, params.textVariant);
  const textFontWeight = getFontWeight(
    e.props.fontWeight,
    params.textFontWeight,
  );
  const textAlignment = getTextAlignment(
    e.props.alignment,
    params.textAlignment,
  );
  return {
    element: 'Text',
    children: mapTextToTemplate(
      getJsxChildren(e) as NonEmptyArray<string | JSXElement>,
      {
        ...params,
        textSize: e.props.size,
        textColor,
        textVariant,
        textFontWeight,
        textAlignment,
      },
    ),
    props: {
      variant: textVariant,
      color: textColor,
      fontWeight: textFontWeight,
      style: {
        textAlign: textAlignment,
      },
    },
  };
};
