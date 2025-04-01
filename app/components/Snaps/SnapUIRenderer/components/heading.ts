import { HeadingElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';
import { TextVariant } from '../../../../component-library/components/Texts/Text';

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

export const heading: UIComponentFactory<HeadingElement> = ({
  element: e,
}) => ({
  element: 'Text',
  children: e.props.children,
  props: {
    variant: generateSize(e.props.size),
    numberOfLines: 0,
    flexWrap: 'wrap',
  },
});
