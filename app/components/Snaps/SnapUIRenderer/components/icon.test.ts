import {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { IconName as SnapsIconName } from '@metamask/snaps-sdk/jsx';
import { mockTheme } from '../../../../util/theme';
import { icon } from './icon';

describe('Icon UIComponentFactory', () => {
  const mockParams = {
    map: {},
    t: jest.fn(),
    theme: mockTheme,
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
        size: IconSize.Sm, // Default size
      },
    });
  });

  it('maps color values correctly', () => {
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
        size: IconSize.Sm,
      },
    });
  });

  it('maps names correctly', () => {
    const mockElement = {
      props: {
        name: SnapsIconName.Arrow2Down,
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = icon({ ...mockParams, element: mockElement as any });

    expect(result).toEqual({
      element: 'SnapUIIcon',
      props: {
        name: IconName.Arrow2Down,
        color: IconColor.Default,
        size: IconSize.Sm,
      },
    });
  });
});
