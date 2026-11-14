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
        { iconName: IconName.Search, onPress: jest.fn() },
        { iconName: IconName.Setting, onPress: jest.fn() },
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
        { iconName: IconName.Trash, onPress: jest.fn() },
        { iconName: IconName.Trash, onPress: jest.fn() },
      ],
    });

    expect(config?.right.map((button) => button.identifier)).toEqual([
      'header-Trash-1',
      'header-Trash',
    ]);
  });

  it.each([
    ['a subtitle', { subtitle: 'Details' }],
    ['a start accessory', { startAccessory: 'x' }],
    ['an end accessory', { endAccessory: 'x' }],
    ['children', { children: 'x' }],
  ])('keeps the JS header for %s', (_label, props) => {
    expect(getNativeHeaderConfig({ title: 'Title', ...props })).toBeUndefined();
  });

  it('keeps the JS header without a text title', () => {
    expect(getNativeHeaderConfig({ onBack: jest.fn() })).toBeUndefined();
  });

  it('keeps the JS header for an icon with no SF Symbol', () => {
    expect(
      getNativeHeaderConfig({
        title: 'Title',
        endButtonIconProps: [{ iconName: IconName.Bank, onPress: jest.fn() }],
      }),
    ).toBeUndefined();
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
