import { ButtonElement, JSXElement } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { NonEmptyArray } from '@metamask/utils';
import {
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { mapTextToTemplate } from '../utils';
import { UIComponentFactory } from './types';

function getTextColor(props: ButtonElement['props']) {
  if (props.disabled) {
    return TextColor.TextMuted;
  }

  switch (props.variant) {
    case 'destructive':
      return TextColor.ErrorDefault;
    case 'primary':
    default:
      return TextColor.PrimaryDefault;
  }
}

export const button: UIComponentFactory<ButtonElement> = ({
  element: e,
  ...params
}) => ({
  element: 'SnapUIButton',
  props: {
    type: e.props.type,
    // This differs from the extension implementation because we don't have proper form support on RN
    form: e.props.form ?? params.form,
    variant: e.props.variant,
    name: e.props.name,
    disabled: e.props.disabled,
    loading: e.props.loading ?? false,
  },
  children: mapTextToTemplate(
    getJsxChildren(e) as NonEmptyArray<string | JSXElement>,
    {
      ...params,
      textColor: getTextColor(e.props),
      textVariant:
        e.props.size === 'sm' ? TextVariant.BodySm : TextVariant.BodyMd,
      textFontWeight: FontWeight.Medium,
    },
  ),
});
