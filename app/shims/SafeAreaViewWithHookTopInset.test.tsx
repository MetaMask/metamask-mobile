import React, { createRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { SafeAreaView } from './SafeAreaViewWithHookTopInset';

const mockUseSafeAreaInsets = jest.fn().mockReturnValue({
  top: 44,
  right: 0,
  bottom: 34,
  left: 0,
});

jest.mock('react-native-safe-area-context/src/SafeAreaContext', () => ({
  useSafeAreaInsets: (...args: unknown[]) => mockUseSafeAreaInsets(...args),
}));

jest.mock('react-native-safe-area-context/src/SafeAreaView', () => {
  const { forwardRef } = jest.requireActual<typeof import('react')>('react');
  const { View: RNView } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SafeAreaView: forwardRef<View>((props, ref) => (
      <RNView ref={ref} {...props} testID="native-safe-area-view" />
    )),
  };
});

const testStyles = StyleSheet.create({
  paddingTop10: { paddingTop: 10 },
  paddingTop100: { paddingTop: 100 },
  marginTop6: { marginTop: 6 },
});

function getNativeViewProps(root: ReturnType<typeof render>) {
  return root.getByTestId('native-safe-area-view').props;
}

describe('SafeAreaViewWithHookTopInset', () => {
  beforeEach(() => {
    mockUseSafeAreaInsets.mockReturnValue({
      top: 44,
      right: 0,
      bottom: 34,
      left: 0,
    });
  });

  describe('edge resolution', () => {
    it('defaults all edges to additive when edges prop is omitted', () => {
      const props = getNativeViewProps(render(<SafeAreaView />));
      expect(props.edges).toEqual({
        top: 'off',
        left: 'additive',
        bottom: 'additive',
        right: 'additive',
      });
    });

    it('converts an array of edges to a record, turning top off for hook handling', () => {
      const props = getNativeViewProps(
        render(<SafeAreaView edges={['top', 'bottom']} />),
      );
      expect(props.edges).toEqual({
        top: 'off',
        right: 'off',
        bottom: 'additive',
        left: 'off',
      });
    });

    it('passes through a record of edges, turning top off for hook handling', () => {
      const props = getNativeViewProps(
        render(<SafeAreaView edges={{ top: 'maximum', bottom: 'additive' }} />),
      );
      expect(props.edges).toEqual({
        top: 'off',
        right: 'off',
        bottom: 'additive',
        left: 'off',
      });
    });

    it('leaves edges unchanged when top is explicitly off', () => {
      const props = getNativeViewProps(
        render(<SafeAreaView edges={{ top: 'off', bottom: 'additive' }} />),
      );
      expect(props.edges).toEqual({
        top: 'off',
        right: 'off',
        bottom: 'additive',
        left: 'off',
      });
    });

    it('leaves top off when edges array does not include top', () => {
      const props = getNativeViewProps(
        render(<SafeAreaView edges={['left', 'right']} />),
      );
      expect(props.edges).toEqual({
        top: 'off',
        right: 'additive',
        bottom: 'off',
        left: 'additive',
      });
    });
  });

  describe('top inset via hook (paddingTop)', () => {
    it('applies insets.top as paddingTop by default (mode=padding)', () => {
      const props = getNativeViewProps(render(<SafeAreaView />));
      const flat = StyleSheet.flatten(props.style);
      expect(flat).toMatchObject({ paddingTop: 44 });
    });

    it('sums existing paddingTop with insets.top in additive mode', () => {
      const props = getNativeViewProps(
        render(<SafeAreaView style={testStyles.paddingTop10} />),
      );
      const flat = StyleSheet.flatten(props.style);
      expect(flat).toMatchObject({ paddingTop: 54 });
    });

    it('uses Math.max of existing paddingTop and insets.top in maximum mode', () => {
      const props = getNativeViewProps(
        render(
          <SafeAreaView
            edges={{ top: 'maximum', bottom: 'additive' }}
            style={testStyles.paddingTop100}
          />,
        ),
      );
      const flat = StyleSheet.flatten(props.style);
      expect(flat).toMatchObject({ paddingTop: 100 });
    });

    it('uses insets.top when insets.top exceeds existing paddingTop in maximum mode', () => {
      const props = getNativeViewProps(
        render(
          <SafeAreaView
            edges={{ top: 'maximum' }}
            style={testStyles.paddingTop10}
          />,
        ),
      );
      const flat = StyleSheet.flatten(props.style);
      expect(flat).toMatchObject({ paddingTop: 44 });
    });
  });

  describe('top inset via hook (marginTop)', () => {
    it('applies insets.top as marginTop when mode is margin', () => {
      const props = getNativeViewProps(render(<SafeAreaView mode="margin" />));
      const flat = StyleSheet.flatten(props.style);
      expect(flat).toMatchObject({ marginTop: 44 });
    });

    it('sums existing marginTop with insets.top in additive mode', () => {
      const props = getNativeViewProps(
        render(<SafeAreaView mode="margin" style={testStyles.marginTop6} />),
      );
      const flat = StyleSheet.flatten(props.style);
      expect(flat).toMatchObject({ marginTop: 50 });
    });
  });

  describe('no hook inset when top edge is off', () => {
    it('does not add paddingTop when top edge is off', () => {
      const props = getNativeViewProps(
        render(<SafeAreaView edges={{ bottom: 'additive' }} />),
      );
      const flat = StyleSheet.flatten(props.style);
      expect(flat?.paddingTop).toBeUndefined();
    });

    it('passes style through unchanged when top edge is off', () => {
      const original = { backgroundColor: 'red', flex: 1 };
      const props = getNativeViewProps(
        render(
          <SafeAreaView edges={{ bottom: 'additive' }} style={original} />,
        ),
      );
      expect(props.style).toEqual(original);
    });
  });

  describe('numericInsetContribution edge cases', () => {
    it('treats undefined paddingTop as 0', () => {
      const props = getNativeViewProps(render(<SafeAreaView style={{}} />));
      const flat = StyleSheet.flatten(props.style);
      expect(flat).toMatchObject({ paddingTop: 44 });
    });

    it('treats NaN paddingTop as 0', () => {
      const props = getNativeViewProps(
        render(<SafeAreaView style={{ paddingTop: NaN }} />),
      );
      const flat = StyleSheet.flatten(props.style);
      expect(flat).toMatchObject({ paddingTop: 44 });
    });

    it('treats string paddingTop as 0', () => {
      const props = getNativeViewProps(
        render(
          <SafeAreaView style={{ paddingTop: '20%' as unknown as number }} />,
        ),
      );
      const flat = StyleSheet.flatten(props.style);
      expect(flat).toMatchObject({ paddingTop: 44 });
    });
  });

  describe('ref forwarding', () => {
    it('forwards a ref to the underlying native view', () => {
      const ref = createRef<View>();
      render(<SafeAreaView ref={ref} />);
      expect(ref.current).toBeTruthy();
    });
  });

  describe('prop passthrough', () => {
    it('passes arbitrary props to the native SafeAreaView', () => {
      const props = getNativeViewProps(
        render(<SafeAreaView testID="custom" accessibilityLabel="test" />),
      );
      expect(props.accessibilityLabel).toBe('test');
    });

    it('passes mode through to the native SafeAreaView', () => {
      const props = getNativeViewProps(render(<SafeAreaView mode="margin" />));
      expect(props.mode).toBe('margin');
    });
  });

  describe('inset value changes', () => {
    it('reflects updated insets.top on re-render', () => {
      const { rerender, getByTestId } = render(<SafeAreaView />);

      mockUseSafeAreaInsets.mockReturnValue({
        top: 20,
        right: 0,
        bottom: 0,
        left: 0,
      });

      rerender(<SafeAreaView />);

      const flat = StyleSheet.flatten(
        getByTestId('native-safe-area-view').props.style,
      );
      expect(flat).toMatchObject({ paddingTop: 20 });
    });
  });
});
