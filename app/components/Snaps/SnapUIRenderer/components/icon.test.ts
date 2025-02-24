import {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { icon } from './icon';

describe('Icon UIComponentFactory', () => {
  const mockParams = {
    map: {},
    t: jest.fn(),
  };

  it('create correct element configuration with valid props', () => {
    const mockElement = {
      props: {
        name: IconName.Danger,
        color: 'primary',
        size: 'md',
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = icon({ ...mockParams, element: mockElement as any });

    expect(result).toEqual({
      element: 'SnapUIIcon',
      props: {
        name: IconName.Danger,
        color: IconColor.Primary,
        size: IconSize.Md,
      },
    });
  });

  it('handle minimal props with defaults', () => {
    const mockElement = {
      props: {
        name: 'invalid-icon',
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = icon({ ...mockParams, element: mockElement as any });

    expect(result).toEqual({
      element: 'SnapUIIcon',
      props: {
        name: IconName.Danger, // Invalid names default to Danger
        color: IconColor.Default, // Default color
        size: 'inherit', // Default size
      },
    });
  });

  it('map color values correctly', () => {
    const mockElement = {
      props: {
        name: IconName.Danger,
        color: 'muted',
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = icon({ ...mockParams, element: mockElement as any });

    expect(result).toEqual({
      element: 'SnapUIIcon',
      props: {
        name: IconName.Danger,
        color: IconColor.Muted,
        size: 'inherit',
      },
    });
  });
});
