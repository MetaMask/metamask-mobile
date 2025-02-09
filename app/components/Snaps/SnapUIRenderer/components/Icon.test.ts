import {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { IconColor } from '../utils';
import { icon } from './icon';

describe('Icon UIComponentFactory', () => {
  const mockParams = {
    map: {},
    t: jest.fn(),
  };

  it('should create correct element configuration with valid props', () => {
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
        color: IconColor.primaryDefault,
        size: IconSize.Md,
      },
    });
  });

  it('should handle minimal props with defaults', () => {
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
        color: IconColor.iconDefault, // Default color
        size: IconSize.Inherit, // Default size
      },
    });
  });

  it('should map color values correctly', () => {
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
        color: IconColor.iconMuted,
        size: IconSize.Inherit,
      },
    });
  });
});
