/* eslint-disable @typescript-eslint/no-shadow */
import { JSXElement, TextElement } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { NonEmptyArray } from '@metamask/utils';
import { mapTextToTemplate } from '../utils';
import { UIComponent, UIComponentFactory, UIComponentParams } from './types';
import { TextProps } from '../../../../../component-library/components/Texts/Text/Text.types';

type ExtendedTextProps = TextProps & Record<string, unknown>;

export const text: UIComponentFactory<TextElement> = ({
  element,
  ...params
}: UIComponentParams<TextElement>): UIComponent => ({
  element: 'Text',
  children: mapTextToTemplate(
    getJsxChildren(element) as NonEmptyArray<string | JSXElement>,
    params,
  ),
  props: element.props as ExtendedTextProps,
});
