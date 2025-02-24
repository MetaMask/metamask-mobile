import { ImageElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';

function generateBorderRadius(
  borderRadius?: ImageElement['props']['borderRadius'],
) {
  switch (borderRadius) {
    default:
    case 'none':
      return 0;

    case 'medium':
      return 6;

    // TODO: Support Full border radius (50%)
  }
}

export const image: UIComponentFactory<ImageElement> = ({ element: e }) => ({
  element: 'SnapUIImage',
  props: {
    value: e.props.src,
    borderRadius: generateBorderRadius(e.props.borderRadius),
  },
});
