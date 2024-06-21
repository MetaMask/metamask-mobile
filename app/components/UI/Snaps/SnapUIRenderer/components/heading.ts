import { Heading } from '@metamask/snaps-sdk';
import { UIComponentFactory } from './types';
import { mapTextToTemplate } from '../utils';
import { getJsxChildren } from '@metamask/snaps-utils';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';

export const heading: UIComponentFactory<Heading> = ({
  element,
  ...params
}) => ({
  element: 'Text',
  children: mapTextToTemplate(getJsxChildren(element), params),
  props: {
    variant: TextVariant.HeadingSM,
    style: { overflowWrap: 'anywhere' },
  },
});
