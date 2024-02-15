// Third party dependencies
import React, { useRef, useEffect } from 'react';
import { render, act } from '@testing-library/react-native';

// External dependencies.
import Text from '../../../../Texts/Text';

// Internal dependencies
import BottomSheetDialog from './BottomSheetDialog';
import { BottomSheetDialogRef } from './BottomSheetDialog.types';

jest.mock('react-native-safe-area-context', () => {
  // using disting digits for mock rects to make sure they are not mixed up
  const inset = { top: 1, right: 2, bottom: 3, left: 4 };
  const frame = { width: 5, height: 6, x: 7, y: 8 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

describe('BottomSheetDialog', () => {
  it('should render correctly', () => {
    const wrapper = render(<BottomSheetDialog />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render the component with children', () => {
    const { getByText } = render(
      <BottomSheetDialog>
        <Text>Test Child</Text>
      </BottomSheetDialog>,
    );
    expect(getByText('Test Child')).toBeTruthy();
  });
  it('should call onOpen when onOpenDialog ref is called', () => {
    const onOpenMock = jest.fn();
    const TestComponent = () => {
      const ref = useRef<BottomSheetDialogRef>(null);

      useEffect(() => {
        if (ref.current) {
          act(() => {
            ref.current?.onOpenDialog();
          });
        }
      }, []);

      return (
        <BottomSheetDialog ref={ref} onOpen={onOpenMock}>
          <Text>Test Child</Text>
        </BottomSheetDialog>
      );
    };

    render(<TestComponent />);

    expect(onOpenMock).toHaveBeenCalled();
  });
  it('should call onClose when onCloseDialog ref is called', () => {
    const onCloseMock = jest.fn();
    const TestComponent = () => {
      const ref = useRef<BottomSheetDialogRef>(null);

      useEffect(() => {
        if (ref.current) {
          act(() => {
            ref.current?.onCloseDialog();
          });
        }
      }, []);

      return (
        <BottomSheetDialog ref={ref} onClose={onCloseMock}>
          <Text>Test Child</Text>
        </BottomSheetDialog>
      );
    };

    render(<TestComponent />);

    expect(onCloseMock).toHaveBeenCalled();
  });
  //   Note: Add Gesture tests when react-native-gesture-handler gets updated
});
