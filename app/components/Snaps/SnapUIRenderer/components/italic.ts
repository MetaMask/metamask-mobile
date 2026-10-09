import { ItalicElement, JSXElement } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { NonEmptyArray } from '@metamask/utils';
import { TextVariant } from '@metamask/design-system-react-native';
import { mapTextToTemplate } from '../utils';
import { UIComponentFactory } from './types';

export const italic: UIComponentFactory<ItalicElement> = ({
  element: e,
  ...params
}) => ({
  element: 'Text',
  children: mapTextToTemplate(
    getJsxChildren(e) as NonEmptyArray<string | JSXElement>,
    params,
  ),
  props: {
    variant: TextVariant.BodyMd,
    color: params.textColor,
    numberOfLines: 0,
    flexWrap: 'wrap',
    style: { fontStyle: 'italic' },
  },
});
