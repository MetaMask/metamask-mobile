import { JSXElement, TextElement } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { NonEmptyArray } from '@metamask/utils';
import { mapTextToTemplate } from '../utils';
import { UIComponentFactory } from './types';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';

export const text: UIComponentFactory<TextElement> = ({
  element,
  ...params
}) => ({
  element: 'Text',
  children: mapTextToTemplate(
    getJsxChildren(element) as NonEmptyArray<string | JSXElement>,
    params,
  ),
  props: {
    variant: TextVariant.BodyMD,
    color: 'inherit',
    className: 'snap-ui-renderer__text',
    style: { overflowWrap: 'anywhere' },
  },
});
