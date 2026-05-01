import { Image } from '@metamask/snaps-sdk/jsx';
import { Image as ExpoImage } from 'expo-image';
import { renderInterface } from '../testUtils';

jest.mock('../../../../core/Engine/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
  context: {
    SnapInterfaceController: {
      updateInterfaceState: jest.fn(),
    },
  },
}));

describe('image component', () => {
  it('renders an SVG image', () => {
    const { getByTestId } = renderInterface(
      Image({
        src: '<svg />',
        borderRadius: 'full',
      }),
    );

    expect(getByTestId('snaps-ui-image')).toBeOnTheScreen();
  });

  it('renders an external image', () => {
    const { queryByTestId, UNSAFE_getByType } = renderInterface(
      Image({
        src: 'https://metamask.io/fox.png',
        borderRadius: 'full',
        width: 200,
        height: 200,
      }),
    );

    const image = UNSAFE_getByType(ExpoImage);
    expect(image.props.source).toEqual({ uri: 'https://metamask.io/fox.png' });
    expect(queryByTestId('snaps-ui-image')).toBeNull();
  });
});
