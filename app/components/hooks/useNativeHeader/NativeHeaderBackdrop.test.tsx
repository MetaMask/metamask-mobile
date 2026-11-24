import React from 'react';
import { render } from '@testing-library/react-native';
import { makeMutable } from 'react-native-reanimated';
import NativeHeaderBackdrop from './NativeHeaderBackdrop';
import { HeaderGlassBackdrop } from '../../../component-library/components-temp/HeaderGlass';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../component-library/components-temp/HeaderGlass', () => ({
  HeaderGlassBackdrop: jest.fn(() => null),
}));

describe('NativeHeaderBackdrop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('covers the status bar and the native bar', () => {
    const { getByTestId } = render(<NativeHeaderBackdrop testID="backdrop" />);

    expect(getByTestId('backdrop')).toHaveStyle({
      position: 'absolute',
      top: 0,
      height: 91,
    });
    expect(getByTestId('backdrop').props.pointerEvents).toBe('none');
  });

  it('fades the backdrop in with the scroll', () => {
    const scrollDistance = makeMutable(0);

    render(
      <NativeHeaderBackdrop
        scrollDistance={scrollDistance}
        fadeInDistance={80}
      />,
    );

    expect(jest.mocked(HeaderGlassBackdrop).mock.calls[0][0]).toEqual({
      scrollDistance,
      fadeInDistance: 80,
    });
  });
});
