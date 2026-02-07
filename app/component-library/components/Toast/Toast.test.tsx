// Third party dependencies.
import React, { createRef } from 'react';
import { View } from 'react-native';
import { render, screen, act, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import Toast from './Toast';
import {
  ButtonIconVariant,
  StatusToastType,
  ToastRef,
  ToastVariants,
  ToastOptions,
} from './Toast.types';
import { ButtonVariants } from '../Buttons/Button';
import { IconName as LegacyIconName } from '../Icons/Icon';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn(() => ({ value: 0 })),
  useAnimatedStyle: jest.fn(() => ({})),
  withTiming: jest.fn((value, _config, callback) => {
    if (callback) {
      callback();
    }
    return value;
  }),
  withDelay: jest.fn((_delay, animation) => animation),
  cancelAnimation: jest.fn(),
  runOnJS: jest.fn((fn) => () => fn()),
  default: {
    View: 'Animated.View',
  },
}));

// Mock safe area context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
}));

jest.mock('@metamask/design-system-react-native', () => ({
  IconColor: { PrimaryDefault: 'PrimaryDefault', Default: 'Default' },
  IconSize: { Lg: 24, Md: 20, Sm: 16 },
  Spinner: () => null,
}));

jest.mock(
  '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs',
  () => {
    const { View: MockView } = jest.requireActual('react-native');
    const MockReact = jest.requireActual('react');
    return {
      Spinner: () =>
        MockReact.createElement(MockView, { testID: 'mock-spinner' }),
    };
  },
);

jest.mock('../Icons/Icon', () => {
  const { View: MockView } = jest.requireActual('react-native');
  const MockReact = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({ name, ...props }: { name: string }) =>
      MockReact.createElement(MockView, {
        testID: `mock-icon-${name}`,
        ...props,
      }),
    IconName: {
      Confirmation: 'Confirmation',
      Danger: 'Danger',
      Close: 'Close',
      AddSquare: 'AddSquare',
    },
    IconColor: {
      Default: 'Default',
      Inverse: 'Inverse',
      Primary: 'Primary',
      Success: 'Success',
      Error: 'Error',
    },
    IconSize: { Lg: '24', Md: '20', Sm: '16', Xs: '12', Xss: '10' },
  };
});

jest.mock('../Buttons/ButtonIcon', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  const MockReact = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({
      onPress,
      iconName,
    }: {
      onPress: () => void;
      iconName: string;
    }) =>
      MockReact.createElement(
        MockText,
        { testID: 'mock-button-icon', onPress },
        iconName,
      ),
  };
});

describe('Toast', () => {
  let toastRef: React.RefObject<ToastRef>;

  beforeEach(() => {
    toastRef = createRef<ToastRef>();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  it('renders correctly with default state', () => {
    const { toJSON } = render(<Toast ref={toastRef} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays toast with correct label when showToast is called', async () => {
    const toastOptions: ToastOptions = {
      variant: ToastVariants.Plain,
      labelOptions: [{ label: 'Test Label' }],
      hasNoTimeout: true,
    };

    render(<Toast ref={toastRef} />);

    await act(async () => {
      toastRef.current?.showToast(toastOptions);
      jest.runAllTimers();
    });

    expect(screen.getByText('Test Label')).toBeOnTheScreen();
  });

  it('displays toast with bold label when isBold is true', async () => {
    const toastOptions: ToastOptions = {
      variant: ToastVariants.Plain,
      labelOptions: [{ label: 'Bold Test Label', isBold: true }],
      hasNoTimeout: true,
    };

    render(<Toast ref={toastRef} />);

    await act(async () => {
      toastRef.current?.showToast(toastOptions);
      jest.runAllTimers();
    });

    expect(screen.getByText('Bold Test Label')).toBeOnTheScreen();
  });

  it('displays toast with multiple label parts', async () => {
    const toastOptions: ToastOptions = {
      variant: ToastVariants.Plain,
      labelOptions: [
        { label: 'First part ' },
        { label: 'bold part', isBold: true },
        { label: ' last part' },
      ],
      hasNoTimeout: true,
    };

    render(<Toast ref={toastRef} />);

    await act(async () => {
      toastRef.current?.showToast(toastOptions);
      jest.runAllTimers();
    });

    expect(screen.getByText('First part ')).toBeOnTheScreen();
    expect(screen.getByText('bold part')).toBeOnTheScreen();
    expect(screen.getByText(' last part')).toBeOnTheScreen();
  });

  it('displays toast with description when descriptionOptions provided', async () => {
    const toastOptions: ToastOptions = {
      variant: ToastVariants.Plain,
      labelOptions: [{ label: 'Test Label' }],
      descriptionOptions: { description: 'Test description' },
      hasNoTimeout: true,
    };

    render(<Toast ref={toastRef} />);

    await act(async () => {
      toastRef.current?.showToast(toastOptions);
      jest.runAllTimers();
    });

    expect(screen.getByText('Test Label')).toBeOnTheScreen();
    expect(screen.getByText('Test description')).toBeOnTheScreen();
  });

  it('hides toast when closeToast is called', async () => {
    const toastOptions: ToastOptions = {
      variant: ToastVariants.Plain,
      labelOptions: [{ label: 'Test Label' }],
      hasNoTimeout: true,
    };

    render(<Toast ref={toastRef} />);

    await act(async () => {
      toastRef.current?.showToast(toastOptions);
      jest.runAllTimers();
    });

    expect(screen.getByText('Test Label')).toBeOnTheScreen();

    await act(async () => {
      toastRef.current?.closeToast();
    });

    expect(screen.queryByText('Test Label')).toBeNull();
  });

  describe('Status variant', () => {
    it('renders Spinner for Pending status type', async () => {
      const toastOptions: ToastOptions = {
        variant: ToastVariants.Status,
        statusType: StatusToastType.Pending,
        labelOptions: [{ label: 'Pending...' }],
        hasNoTimeout: true,
      };

      render(<Toast ref={toastRef} />);

      await act(async () => {
        toastRef.current?.showToast(toastOptions);
        jest.runAllTimers();
      });

      expect(screen.getByTestId('mock-spinner')).toBeOnTheScreen();
      expect(screen.getByText('Pending...')).toBeOnTheScreen();
    });

    it('renders success icon for Success status type', async () => {
      const toastOptions: ToastOptions = {
        variant: ToastVariants.Status,
        statusType: StatusToastType.Success,
        labelOptions: [{ label: 'Done' }],
        hasNoTimeout: true,
      };

      render(<Toast ref={toastRef} />);

      await act(async () => {
        toastRef.current?.showToast(toastOptions);
        jest.runAllTimers();
      });

      expect(
        screen.getByTestId(`mock-icon-${LegacyIconName.Confirmation}`),
      ).toBeOnTheScreen();
      expect(screen.getByText('Done')).toBeOnTheScreen();
    });

    it('renders error icon for Failure status type', async () => {
      const toastOptions: ToastOptions = {
        variant: ToastVariants.Status,
        statusType: StatusToastType.Failure,
        labelOptions: [{ label: 'Failed' }],
        hasNoTimeout: true,
      };

      render(<Toast ref={toastRef} />);

      await act(async () => {
        toastRef.current?.showToast(toastOptions);
        jest.runAllTimers();
      });

      expect(
        screen.getByTestId(`mock-icon-${LegacyIconName.Danger}`),
      ).toBeOnTheScreen();
      expect(screen.getByText('Failed')).toBeOnTheScreen();
    });
  });

  describe('close button', () => {
    it('renders ButtonIcon when closeButtonOptions uses Icon variant', async () => {
      const mockOnPress = jest.fn();
      const toastOptions: ToastOptions = {
        variant: ToastVariants.Plain,
        labelOptions: [{ label: 'With close' }],
        hasNoTimeout: true,
        closeButtonOptions: {
          variant: ButtonIconVariant.Icon,
          iconName: LegacyIconName.Close,
          onPress: mockOnPress,
        },
      };

      render(<Toast ref={toastRef} />);

      await act(async () => {
        toastRef.current?.showToast(toastOptions);
        jest.runAllTimers();
      });

      const buttonIcon = screen.getByTestId('mock-button-icon');

      expect(buttonIcon).toBeOnTheScreen();

      fireEvent.press(buttonIcon);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('renders Button when closeButtonOptions uses ButtonProps', async () => {
      const mockOnPress = jest.fn();
      const toastOptions: ToastOptions = {
        variant: ToastVariants.Plain,
        labelOptions: [{ label: 'With button' }],
        hasNoTimeout: true,
        closeButtonOptions: {
          variant: ButtonVariants.Secondary,
          label: 'Retry',
          onPress: mockOnPress,
        },
      };

      render(<Toast ref={toastRef} />);

      await act(async () => {
        toastRef.current?.showToast(toastOptions);
        jest.runAllTimers();
      });

      const retryButton = screen.getByText('Retry');

      expect(retryButton).toBeOnTheScreen();

      fireEvent.press(retryButton);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('startAccessory', () => {
    it('renders custom startAccessory instead of avatar', async () => {
      const toastOptions: ToastOptions = {
        variant: ToastVariants.Plain,
        labelOptions: [{ label: 'Custom accessory' }],
        hasNoTimeout: true,
        startAccessory: <View testID="custom-accessory" />,
      };

      render(<Toast ref={toastRef} />);

      await act(async () => {
        toastRef.current?.showToast(toastOptions);
        jest.runAllTimers();
      });

      expect(screen.getByTestId('custom-accessory')).toBeOnTheScreen();
      expect(screen.getByText('Custom accessory')).toBeOnTheScreen();
    });
  });
});
