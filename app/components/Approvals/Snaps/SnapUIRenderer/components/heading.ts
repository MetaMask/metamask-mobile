import { HeadingElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';

export const generateSize = (size: HeadingElement['props']['size']) => {
  switch (size) {
    case 'sm':
      return TextVariant.HeadingSM;
    case 'md':
      return TextVariant.HeadingMD;
    case 'lg':
      return TextVariant.HeadingLG;
    default:
      return TextVariant.HeadingSM;
  }
};

export const heading: UIComponentFactory<HeadingElement> = ({ element }) => ({
  element: 'Text',
  children: element.props.children,
  props: {
    variant: generateSize(element.props.size),
    numberOfLines: 0,
  },
});
