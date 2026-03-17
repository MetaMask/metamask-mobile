import {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import {
  IconElement,
  IconName as SnapsIconName,
} from '@metamask/snaps-sdk/jsx';
import { mockTheme } from '../../../../util/theme';
import { icon } from './icon';
import { UIComponentParams } from './types';

describe('Icon UIComponentFactory', () => {
  const createMockParams = (
    element: IconElement,
    textSize?: string,
  ): UIComponentParams<IconElement> => ({
    map: {},
    t: jest.fn(),
    theme: mockTheme,
    element,
    textSize,
  });

  const createMockElement = (props: IconElement['props']): IconElement => ({
    type: 'Icon',
    props,
    key: null,
  });

  it('create correct element configuration with valid props', () => {
    const mockElement = createMockElement({
      name: SnapsIconName.Danger,
      color: 'primary',
      size: 'md',
    });

    const result = icon(createMockParams(mockElement));

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
    const mockElement = createMockElement({
      name: 'invalid-icon' as SnapsIconName,
    });

    const result = icon(createMockParams(mockElement));

    expect(result).toEqual({
      element: 'SnapUIIcon',
      props: {
        name: IconName.Danger,
        color: IconColor.Default,
        size: IconSize.Sm,
      },
    });
  });

  it('maps color values correctly', () => {
    const mockElement = createMockElement({
      name: SnapsIconName.Danger,
      color: 'muted',
    });

    const result = icon(createMockParams(mockElement));

    expect(result).toEqual({
      element: 'SnapUIIcon',
      props: {
        name: IconName.Danger,
        color: IconColor.Muted,
        size: IconSize.Sm,
      },
    });
  });

  it('maps error color correctly', () => {
    const mockElement = createMockElement({
      name: SnapsIconName.Danger,
      color: 'error',
    });

    const result = icon(createMockParams(mockElement));

    expect(result).toEqual({
      element: 'SnapUIIcon',
      props: {
        name: IconName.Danger,
        color: IconColor.Error,
        size: IconSize.Sm,
      },
    });
  });

  it('maps warning color correctly', () => {
    const mockElement = createMockElement({
      name: SnapsIconName.Danger,
      color: 'warning',
    });

    const result = icon(createMockParams(mockElement));

    expect(result).toEqual({
      element: 'SnapUIIcon',
      props: {
        name: IconName.Danger,
        color: IconColor.Warning,
        size: IconSize.Sm,
      },
    });
  });

  it('maps success color correctly', () => {
    const mockElement = createMockElement({
      name: SnapsIconName.Danger,
      color: 'success',
    });

    const result = icon(createMockParams(mockElement));

    expect(result).toEqual({
      element: 'SnapUIIcon',
      props: {
        name: IconName.Danger,
        color: IconColor.Success,
        size: IconSize.Sm,
      },
    });
  });

  it('maps names correctly', () => {
    const mockElement = createMockElement({
      name: SnapsIconName.Arrow2Down,
    });

    const result = icon(createMockParams(mockElement));

    expect(result).toEqual({
      element: 'SnapUIIcon',
      props: {
        name: IconName.Arrow2Down,
        color: IconColor.Default,
        size: IconSize.Sm,
      },
    });
  });

  it('uses textSize for icon size when element size is not provided', () => {
    const mockElement = createMockElement({
      name: SnapsIconName.Danger,
    });

    const result = icon(createMockParams(mockElement, 'md'));

    expect(result).toEqual({
      element: 'SnapUIIcon',
      props: {
        name: IconName.Danger,
        color: IconColor.Default,
        size: IconSize.Md,
      },
    });
  });

  it('prefers element size over textSize', () => {
    const mockElement = createMockElement({
      name: SnapsIconName.Danger,
      size: 'md',
    });

    const result = icon(createMockParams(mockElement, 'sm'));

    expect(result).toEqual({
      element: 'SnapUIIcon',
      props: {
        name: IconName.Danger,
        color: IconColor.Default,
        size: IconSize.Md,
      },
    });
  });
});
