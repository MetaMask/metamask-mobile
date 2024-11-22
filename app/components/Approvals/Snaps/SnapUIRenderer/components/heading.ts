import { HeadingElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';

export const heading: UIComponentFactory<HeadingElement> = ({ element }) => ({
  element: 'SheetHeader',
  props: {
    title: element.props.children,
  },
});
