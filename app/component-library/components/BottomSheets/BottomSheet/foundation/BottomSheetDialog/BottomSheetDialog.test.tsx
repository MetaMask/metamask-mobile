// Third party dependencies
import React, { useRef, useEffect } from 'react';
import { render, act } from '@testing-library/react-native';

// External dependencies.
import Text from '../../../../Texts/Text';

// Internal dependencies
import BottomSheetDialog from './BottomSheetDialog';
import { BottomSheetDialogRef } from './BottomSheetDialog.types';
import { Platform } from 'react-native';

jest.mock('react-native', () => {
  const actualRN = jest.requireActual('react-native');
  return {
    ...actualRN,
    Platform: {
      ...actualRN.Platform,
      OS: 'ios',
    },
  };
});

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
    Platform.OS = 'ios';

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

  describe('simultaneousHandlers', () => {
    it('accepts a single ref as simultaneousHandlers without error', () => {
      const handler = React.createRef<unknown>();
      const wrapper = render(
        <BottomSheetDialog simultaneousHandlers={handler}>
          <Text>Test Child</Text>
        </BottomSheetDialog>,
      );
      expect(wrapper).toMatchSnapshot();
    });

    it('accepts an array of refs as simultaneousHandlers without error', () => {
      const handler1 = React.createRef<unknown>();
      const handler2 = React.createRef<unknown>();
      const wrapper = render(
        <BottomSheetDialog simultaneousHandlers={[handler1, handler2]}>
          <Text>Test Child</Text>
        </BottomSheetDialog>,
      );
      expect(wrapper).toMatchSnapshot();
    });

    it('renders children correctly when simultaneousHandlers is provided', () => {
      const handler = React.createRef<unknown>();
      const { getByText } = render(
        <BottomSheetDialog simultaneousHandlers={handler}>
          <Text>Scrollable Content</Text>
        </BottomSheetDialog>,
      );
      expect(getByText('Scrollable Content')).toBeTruthy();
    });

    it('renders normally when simultaneousHandlers is undefined', () => {
      const { getByText } = render(
        <BottomSheetDialog simultaneousHandlers={undefined}>
          <Text>No Handler</Text>
        </BottomSheetDialog>,
      );
      expect(getByText('No Handler')).toBeTruthy();
    });
  });
});
