import { Image } from '@metamask/snaps-sdk/jsx';
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
    const { toJSON } = renderInterface(
      Image({
        src: '<svg />',
        borderRadius: 'full',
      }),
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders an external image', () => {
    const { toJSON } = renderInterface(
      Image({
        src: 'https://metamask.io/fox.png',
        borderRadius: 'full',
        width: 200,
        height: 200,
      }),
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
