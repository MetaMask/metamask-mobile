import React from 'react';
import { Text } from 'react-native';
import { IconName } from '@metamask/design-system-react-native';

import {
  getNativeHeaderConfig,
  toNativeHeaderItems,
} from './headerStandardNativeItems';

describe('getNativeHeaderConfig', () => {
  it('maps a title and back button to the native bar', () => {
    const onBack = jest.fn();

    const config = getNativeHeaderConfig({ title: 'Settings', onBack });

    expect(config).toEqual({
      title: 'Settings',
      left: [
        {
          identifier: 'header-back',
          symbol: 'chevron.backward',
          label: 'Back',
          isDisabled: false,
        },
      ],
      right: [],
      handlers: { 'header-back': expect.any(Function) },
    });
    config?.handlers['header-back']();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('prefers the back button press handler over onBack', () => {
    const onBack = jest.fn();
    const onPress = jest.fn();

    const config = getNativeHeaderConfig({
      title: 'Settings',
      onBack,
      backButtonProps: { onPress },
    });
    config?.handlers['header-back']();

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onBack).not.toHaveBeenCalled();
  });

  it('orders end buttons left to right with close rightmost', () => {
    const config = getNativeHeaderConfig({
      title: 'Rewards',
      onClose: jest.fn(),
      endButtonIconProps: [
        {
          iconName: IconName.Search,
          accessibilityLabel: 'Search',
          onPress: jest.fn(),
        },
        {
          iconName: IconName.Setting,
          accessibilityLabel: 'Settings',
          onPress: jest.fn(),
        },
      ],
    });

    expect(config?.right.map((button) => button.symbol)).toEqual([
      'gearshape',
      'magnifyingglass',
      'xmark',
    ]);
  });

  it('keeps identifiers unique when an icon repeats', () => {
    const config = getNativeHeaderConfig({
      title: 'Edit',
      endButtonIconProps: [
        {
          iconName: IconName.Trash,
          accessibilityLabel: 'Delete',
          onPress: jest.fn(),
        },
        {
          iconName: IconName.Trash,
          accessibilityLabel: 'Delete',
          onPress: jest.fn(),
        },
      ],
    });

    expect(config?.right.map((button) => button.identifier)).toEqual([
      'header-end-Trash-1',
      'header-end-Trash',
    ]);
  });

  it('keeps start and end buttons with the same icon apart', () => {
    const onStart = jest.fn();
    const onEnd = jest.fn();

    const config = getNativeHeaderConfig({
      title: 'Search',
      startButtonIconProps: {
        iconName: IconName.Search,
        accessibilityLabel: 'Search',
        onPress: onStart,
      },
      endButtonIconProps: [
        {
          iconName: IconName.Search,
          accessibilityLabel: 'Search',
          onPress: onEnd,
        },
      ],
    });
    config?.handlers[config.left[0].identifier]();

    expect(config?.left[0].identifier).not.toBe(config?.right[0].identifier);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onEnd).not.toHaveBeenCalled();
  });

  it.each([
    ['a subtitle', { subtitle: 'Details' }],
    ['a start accessory', { startAccessory: 'x' }],
    ['an end accessory', { endAccessory: 'x' }],
    ['children', { children: 'x' }],
  ])('keeps the JS header for %s', (_label, props) => {
    expect(getNativeHeaderConfig({ title: 'Title', ...props })).toBeUndefined();
  });

  it('maps a header with no title to an empty native title', () => {
    expect(getNativeHeaderConfig({ onBack: jest.fn() })).toEqual(
      expect.objectContaining({
        title: '',
        left: [expect.objectContaining({ identifier: 'header-back' })],
      }),
    );
  });

  it('keeps the JS header for a non-text title', () => {
    expect(
      getNativeHeaderConfig({
        title: React.createElement(Text, null, 'Custom'),
      }),
    ).toBeUndefined();
  });

  it('keeps the JS header for an icon with no SF Symbol', () => {
    expect(
      getNativeHeaderConfig({
        title: 'Title',
        endButtonIconProps: [
          {
            iconName: IconName.Bank,
            accessibilityLabel: 'Bank',
            onPress: jest.fn(),
          },
        ],
      }),
    ).toBeUndefined();
  });

  it('keeps the JS header for an icon button with no label', () => {
    expect(
      getNativeHeaderConfig({
        title: 'Title',
        endButtonIconProps: [{ iconName: IconName.Scan, onPress: jest.fn() }],
      }),
    ).toBeUndefined();
  });

  it('labels back and close buttons by default', () => {
    const config = getNativeHeaderConfig({
      title: 'Title',
      onBack: jest.fn(),
      onClose: jest.fn(),
    });

    expect(config?.left[0].label).toBe('Back');
    expect(config?.right[0].label).toBe('Close');
  });
});

describe('toNativeHeaderItems', () => {
  it('builds native buttons that report their identifier on press', () => {
    const onPress = jest.fn();

    const [item] = toNativeHeaderItems(
      [
        {
          identifier: 'header-back',
          symbol: 'chevron.backward',
          label: 'Back',
          isDisabled: true,
        },
      ],
      onPress,
    );

    expect(item).toEqual(
      expect.objectContaining({
        type: 'button',
        identifier: 'header-back',
        accessibilityLabel: 'Back',
        icon: { type: 'sfSymbol', name: 'chevron.backward' },
        disabled: true,
      }),
    );
    if (item.type === 'button') {
      item.onPress();
    }
    expect(onPress).toHaveBeenCalledWith('header-back');
  });
});
