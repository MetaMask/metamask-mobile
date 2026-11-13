import React from 'react';
import { render } from '@testing-library/react-native';

import HeaderStandardNative from './HeaderStandardNative';
import type { NativeHeaderConfig } from './headerStandardNativeItems';
import {
  NATIVE_HEADER_BAR_HEIGHT,
  useNativeHeader,
} from '../../../components/hooks/useNativeHeader';

jest.mock('../../../components/hooks/useNativeHeader', () => ({
  NATIVE_HEADER_BAR_HEIGHT: 44,
  useNativeHeader: jest.fn(() => true),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 62, bottom: 0, left: 0, right: 0 }),
}));

const buildConfig = (onBack: () => void): NativeHeaderConfig => ({
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
  handlers: { 'header-back': onBack },
});

const lastHeaderConfig = () => {
  const calls = jest.mocked(useNativeHeader).mock.calls;
  return calls[calls.length - 1][0];
};

describe('HeaderStandardNative', () => {
  beforeEach(() => {
    jest.mocked(useNativeHeader).mockClear();
  });

  it('leaves a spacer as tall as the native bar in the header slot', () => {
    const { getByTestId } = render(
      <HeaderStandardNative config={buildConfig(jest.fn())} testID="header" />,
    );

    expect(getByTestId('header')).toHaveStyle({
      height: 62 + NATIVE_HEADER_BAR_HEIGHT,
    });
  });

  it('hands the title and buttons to the native bar', () => {
    const onBack = jest.fn();
    render(<HeaderStandardNative config={buildConfig(onBack)} />);

    const config = lastHeaderConfig();
    const [backItem] = config?.leftItems?.() ?? [];

    expect(config).toEqual(
      expect.objectContaining({ title: 'Settings', hidesBackButton: true }),
    );
    expect(backItem).toEqual(
      expect.objectContaining({ type: 'button', identifier: 'header-back' }),
    );
    if (backItem?.type === 'button') {
      backItem.onPress();
    }
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('keeps the items stable across renders with an unchanged look', () => {
    const { rerender } = render(
      <HeaderStandardNative config={buildConfig(jest.fn())} />,
    );
    const firstItems = lastHeaderConfig()?.leftItems;

    rerender(<HeaderStandardNative config={buildConfig(jest.fn())} />);

    expect(lastHeaderConfig()?.leftItems).toBe(firstItems);
  });

  it('calls the latest press handler after a re-render', () => {
    const firstOnBack = jest.fn();
    const nextOnBack = jest.fn();
    const { rerender } = render(
      <HeaderStandardNative config={buildConfig(firstOnBack)} />,
    );
    rerender(<HeaderStandardNative config={buildConfig(nextOnBack)} />);

    const [backItem] = lastHeaderConfig()?.leftItems?.() ?? [];
    if (backItem?.type === 'button') {
      backItem.onPress();
    }

    expect(nextOnBack).toHaveBeenCalledTimes(1);
    expect(firstOnBack).not.toHaveBeenCalled();
  });
});
