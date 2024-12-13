/* eslint-disable @typescript-eslint/no-shadow */
import { BoldElement, JSXElement } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { NonEmptyArray } from '@metamask/utils';
import { mapTextToTemplate, TextWrap } from '../utils';
import {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { TextProps } from '../../../../../component-library/components/Texts/Text/Text.types';

import { UIComponentFactory } from './types';

type ExtendedTextProps = TextProps & Record<string, unknown>;

export const bold: UIComponentFactory<BoldElement> = ({
  element,
  ...params
}) => ({
  element: 'Text',
  children: mapTextToTemplate(
    getJsxChildren(element) as NonEmptyArray<string | JSXElement>,
    params,
  ),
  props: {
    variant: TextVariant.BodyMDBold,
    ellipsizeMode: TextWrap.TailEllipsis,
    color: TextColor.Default,
    ...(element.props as ExtendedTextProps),
  },
});
