import { JSXElement, TextElement } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { NonEmptyArray } from '@metamask/utils';
import { TextColor, TextVariant } from '@metamask/design-system-react-native';
import { typography } from '@metamask/design-tokens';
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
  color: TextElement['props']['fontWeight'],
  inheritedWeight?: string,
) {
  switch (color ?? inheritedWeight) {
    case 'bold':
      return typography.sBodyMDBold.fontWeight;
    case 'medium':
      return typography.sBodyMDMedium.fontWeight;
    case 'regular':
    default:
      return typography.sBodyMD.fontWeight;
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
      style: {
        fontWeight: textFontWeight,
        textAlign: textAlignment,
      },
    },
  };
};
