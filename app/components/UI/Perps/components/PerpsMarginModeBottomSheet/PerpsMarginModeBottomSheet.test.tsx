import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PerpsMarginModeBottomSheet from './PerpsMarginModeBottomSheet';

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');

    return ReactActual.forwardRef(
      (
        {
          children,
          onClose,
        }: {
          children: React.ReactNode;
          shouldNavigateBack?: boolean;
          onClose: () => void;
        },
        ref: React.Ref<{
          onOpenBottomSheet: () => void;
          onCloseBottomSheet: () => void;
        }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onOpenBottomSheet: jest.fn(),
          onCloseBottomSheet: jest.fn(),
        }));

        return (
          <View testID="bottom-sheet" onTouchStart={onClose}>
            {children}
          </View>
        );
      },
    );
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View } = jest.requireActual('react-native');

    return ({
      children,
      onClose,
    }: {
      children: React.ReactNode;
      onClose: () => void;
    }) => (
      <View testID="bottom-sheet-header">
        {children}
        <View testID="header-close-button" onTouchStart={onClose} />
      </View>
    );
  },
);

describe('PerpsMarginModeBottomSheet', () => {
  it('renders Isolated and Cross rows', () => {
    render(<PerpsMarginModeBottomSheet onClose={jest.fn()} />);
    expect(screen.getByText('Isolated')).toBeTruthy();
    expect(screen.getByText('Cross')).toBeTruthy();
  });

  it('calls onClose when the Isolated row is pressed', () => {
    const onClose = jest.fn();
    render(<PerpsMarginModeBottomSheet onClose={onClose} />);
    fireEvent.press(screen.getByText('Isolated'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the margin mode title', () => {
    render(<PerpsMarginModeBottomSheet onClose={jest.fn()} />);
    expect(screen.getByText('Choose margin mode')).toBeTruthy();
  });
});
