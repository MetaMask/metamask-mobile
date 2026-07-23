// Third party dependencies
import React, { useRef, useEffect } from 'react';
import { render, act, waitFor } from '@testing-library/react-native';

// External dependencies.
import Text from '../../../../Texts/Text';

// Internal dependencies
import BottomSheetDialog from './BottomSheetDialog';
import { BottomSheetDialogRef } from './BottomSheetDialog.types';
import { Platform, StyleSheet, ViewStyle } from 'react-native';
import { ReactTestRendererJSON } from 'react-test-renderer';

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
    expect(wrapper.toJSON()).toBeDefined();
  });
  it('should render the component with children', () => {
    const { getByText } = render(
      <BottomSheetDialog>
        <Text>Test Child</Text>
      </BottomSheetDialog>,
    );
    expect(getByText('Test Child')).toBeOnTheScreen();
  });
  it('should call onOpen when onOpenDialog ref is called', async () => {
    const onOpenMock = jest.fn();
    const TestComponent = () => {
      const ref = useRef<BottomSheetDialogRef>(null);

      useEffect(() => {
        if (ref.current) {
          ref.current?.onOpenDialog();
        }
      }, []);

      return (
        <BottomSheetDialog ref={ref} onOpen={onOpenMock}>
          <Text>Test Child</Text>
        </BottomSheetDialog>
      );
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(onOpenMock).toHaveBeenCalled();
    });
  });

  it('should call onClose when onCloseDialog ref is called', async () => {
    Platform.OS = 'ios';

    const onCloseMock = jest.fn();
    const TestComponent = () => {
      const ref = useRef<BottomSheetDialogRef>(null);

      useEffect(() => {
        if (ref.current) {
          ref.current?.onCloseDialog();
        }
      }, []);

      return (
        <BottomSheetDialog ref={ref} onClose={onCloseMock}>
          <Text>Test Child</Text>
        </BottomSheetDialog>
      );
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalled();
    });
  });
  it('calls onClose only once when onCloseDialog is invoked twice rapidly', async () => {
    const onCloseMock = jest.fn();
    const TestComponent = () => {
      const ref = useRef<BottomSheetDialogRef>(null);

      useEffect(() => {
        if (ref.current) {
          ref.current?.onCloseDialog();
          ref.current?.onCloseDialog();
        }
      }, []);

      return (
        <BottomSheetDialog ref={ref} onClose={onCloseMock}>
          <Text>Test Child</Text>
        </BottomSheetDialog>
      );
    };

    render(<TestComponent />);
    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  it('allows closing again after re-opening', async () => {
    const onCloseMock = jest.fn();
    const onOpenMock = jest.fn();
    const TestComponent = () => {
      const ref = useRef<BottomSheetDialogRef>(null);

      useEffect(() => {
        if (ref.current) {
          ref.current?.onCloseDialog();
          ref.current?.onOpenDialog();
          ref.current?.onCloseDialog();
        }
      }, []);

      return (
        <BottomSheetDialog ref={ref} onClose={onCloseMock} onOpen={onOpenMock}>
          <Text>Test Child</Text>
        </BottomSheetDialog>
      );
    };

    render(<TestComponent />);
    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalledTimes(2);
    });
  });
  it('calls onClose only once when onCloseDialog is invoked twice rapidly', async () => {
    const onCloseMock = jest.fn();
    const TestComponent = () => {
      const ref = useRef<BottomSheetDialogRef>(null);

      useEffect(() => {
        if (ref.current) {
          ref.current?.onCloseDialog();
          ref.current?.onCloseDialog();
        }
      }, []);

      return (
        <BottomSheetDialog ref={ref} onClose={onCloseMock}>
          <Text>Test Child</Text>
        </BottomSheetDialog>
      );
    };

    render(<TestComponent />);
    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  it('allows closing again after re-opening', async () => {
    const onCloseMock = jest.fn();
    const onOpenMock = jest.fn();
    const TestComponent = () => {
      const ref = useRef<BottomSheetDialogRef>(null);

      useEffect(() => {
        if (ref.current) {
          ref.current?.onCloseDialog();
          ref.current?.onOpenDialog();
          ref.current?.onCloseDialog();
        }
      }, []);

      return (
        <BottomSheetDialog ref={ref} onClose={onCloseMock} onOpen={onOpenMock}>
          <Text>Test Child</Text>
        </BottomSheetDialog>
      );
    };

    render(<TestComponent />);
    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalledTimes(2);
    });
  });
  describe('bottom border', () => {
    // The sheet view is identified by its unique top corner radius.
    const findSheetStyle = (
      node: ReactTestRendererJSON | ReactTestRendererJSON[] | string | null,
    ): ViewStyle | undefined => {
      if (!node || typeof node === 'string') {
        return undefined;
      }
      if (Array.isArray(node)) {
        for (const child of node) {
          const found = findSheetStyle(child);
          if (found) {
            return found;
          }
        }
        return undefined;
      }
      const flattened = StyleSheet.flatten(node.props.style) as
        | ViewStyle
        | undefined;
      if (flattened?.borderTopLeftRadius === 24) {
        return flattened;
      }
      return findSheetStyle(node.children as ReactTestRendererJSON[] | null);
    };

    it('removes the bottom border by default', () => {
      const { toJSON } = render(<BottomSheetDialog />);

      const sheetStyle = findSheetStyle(toJSON());

      expect(sheetStyle?.borderWidth).toBe(1);
      expect(sheetStyle?.borderBottomWidth).toBe(0);
    });

    it('keeps the bottom border when hasBottomBorder is true', () => {
      const { toJSON } = render(<BottomSheetDialog hasBottomBorder />);

      const sheetStyle = findSheetStyle(toJSON());

      expect(sheetStyle?.borderWidth).toBe(1);
      expect(sheetStyle?.borderBottomWidth).toBeUndefined();
    });
  });

  //   Note: Add Gesture tests when react-native-gesture-handler gets updated

  describe('swipe gesture', () => {
    it('renders its children inside the GestureDetector', () => {
      const { getByText } = render(
        <BottomSheetDialog>
          <Text>Gesture Child</Text>
        </BottomSheetDialog>,
      );
      expect(getByText('Gesture Child')).toBeOnTheScreen();
    });
  });
});
