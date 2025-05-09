import { image } from './image';
import { mockTheme } from '../../../../util/theme';
import { ImageElement } from '@metamask/snaps-sdk/jsx';

describe('image component', () => {
  const defaultParams = {
    map: {},
    t: jest.fn(),
    theme: mockTheme,
  };

  it('should render image with some props', () => {
    const imageElement: ImageElement = {
      type: 'Image',
      props: {
        src: '<svg />',
        borderRadius: 'full',
      },
      key: null,
    };

    const result = image({ element: imageElement, ...defaultParams });

    expect(result).toEqual({
      element: 'SnapUIImage',
      props: {
        borderRadius: 999,
        value: '<svg />',
      },
    });
  });
});
