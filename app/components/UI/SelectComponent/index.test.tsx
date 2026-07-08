import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import SelectComponent from './';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View, Pressable } = jest.requireActual('react-native');

  const MockBottomSheet = ReactActual.forwardRef(
    (
      {
        children,
        onClose,
      }: {
        children?: React.ReactNode;
        onClose?: () => void;
      },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: (callback?: () => void) => {
          callback?.();
        },
        onOpenBottomSheet: jest.fn(),
      }));

      return ReactActual.createElement(
        View,
        { testID: 'select-bottom-sheet' },
        children,
        ReactActual.createElement(Pressable, {
          testID: 'select-bottom-sheet-backdrop',
          onPress: onClose,
        }),
      );
    },
  );

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
    BottomSheetHeader: ({
      children,
      onClose,
    }: {
      children?: React.ReactNode;
      onClose?: () => void;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'select-bottom-sheet-header' },
        children,
        ReactActual.createElement(Pressable, {
          testID: 'select-bottom-sheet-close',
          onPress: onClose,
        }),
      ),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../util/theme/themeUtils', () => ({
  ...jest.requireActual('../../../util/theme/themeUtils'),
  useElevatedSurface: () => 'bg-default',
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    colors: {},
  },
}));

describe('SelectComponent', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <SelectComponent
        options={[
          { key: 'key-1', value: 'val-1', label: 'option 1' },
          { key: 'key-2', value: 'val-2', label: 'option 2' },
        ]}
        selectedValue="val-2"
        label="Choose an option"
        onValueChange={jest.fn()}
      />,
    );
    expect(toJSON()).not.toBeNull();
  });
});
