import { HeadingElement } from '@metamask/snaps-sdk/jsx';
import { TextVariant } from '@metamask/design-system-react-native';
import { UIComponentFactory } from './types';

export const generateSize = (size: HeadingElement['props']['size']) => {
  switch (size) {
    case 'sm':
      return TextVariant.HeadingSm;
    case 'md':
      return TextVariant.HeadingMd;
    case 'lg':
      return TextVariant.HeadingLg;
    default:
      return TextVariant.HeadingSm;
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
