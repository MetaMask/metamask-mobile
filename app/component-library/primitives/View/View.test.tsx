import React, { createRef, type ComponentRef } from 'react';
import { render } from '@testing-library/react-native';
import { View as RNView } from 'react-native';

import { View } from './View';

const mockTwStyle = jest.fn((className: string): { paddingRight?: number } =>
  className === 'pr-2' ? { paddingRight: 8 } : {},
);

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: (): { style: typeof mockTwStyle } =>
    Object.assign(() => ({}), {
      style: mockTwStyle,
    }),
}));

describe('View', () => {
  beforeEach(() => {
    mockTwStyle.mockClear();
  });

  it('maps className to style ahead of the style prop', () => {
    const style = { flex: 1 };

    const { getByTestId } = render(
      <View className="pr-2" style={style} testID="class-name-view" />,
    );

    expect(mockTwStyle).toHaveBeenCalledWith('pr-2');
    expect(getByTestId('class-name-view').props.style).toEqual([
      { paddingRight: 8 },
      style,
    ]);
    expect(getByTestId('class-name-view').props.className).toBeUndefined();
  });

  it('leaves style unchanged when className is omitted', () => {
    const style = { flex: 1 };

    const { getByTestId } = render(<View style={style} testID="plain-view" />);

    expect(mockTwStyle).not.toHaveBeenCalled();
    expect(getByTestId('plain-view').props.style).toBe(style);
  });

  it('forwards ref to the underlying view', () => {
    const ref = createRef<ComponentRef<typeof RNView>>();

    render(<View ref={ref} testID="ref-view" />);

    expect(ref.current).toBeTruthy();
  });
});
