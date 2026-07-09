// Third party dependencies.
import React, { createRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { render, screen, act, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import Toast, { shouldTopAlignToastContent } from './Toast';
import { AvatarAccountType } from '../Avatars/Avatar';
import { AVATARFAVICON_IMAGE_TESTID } from '../Avatars/Avatar/variants/AvatarFavicon/AvatarFavicon.constants';
import { AVATARNETWORK_IMAGE_TESTID } from '../Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork.constants';
import { ButtonVariants } from '../Buttons/Button/Button.types';
import { IconColor, IconName } from '../Icons/Icon';
import {
  ButtonIconVariant,
  ToastRef,
  ToastVariants,
  ToastOptions,
} from './Toast.types';
import { ToastSelectorsIDs } from './ToastModal.testIds';
import { lightTheme } from '@metamask/design-tokens';
import { visibilityDuration } from './Toast.constants';

const TEST_ACCOUNT_ADDRESS = '0x2990079bcdEe240329a520d2444386FC119da21a';
const TEST_NETWORK_NAME = 'Ethereum Mainnet';
const TEST_NETWORK_IMAGE_SOURCE = {
  uri: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880',
};
const TEST_APP_ICON_SOURCE = {
  uri: 'https://app.uniswap.org/favicon.ico',
};

// react-native-reanimated is already mocked globally via setUpTests() in testSetup.js

const triggerToastLayout = (view: ReturnType<typeof render>) => {
  fireEvent(view.UNSAFE_getByType(Animated.View), 'onLayout', {
    nativeEvent: { layout: { height: 120, width: 320, x: 0, y: 0 } },
  });
};

const showToast = async (
  toastRef: React.RefObject<ToastRef | null>,
  options: ToastOptions,
) => {
  await act(async () => {
    toastRef.current?.showToast(options);
    jest.runAllTimers();
  });
};

// Mock safe area context
describe('Toast', () => {
  let toastRef: React.RefObject<ToastRef | null>;

  beforeEach(() => {
    toastRef = createRef<ToastRef>();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
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

  it('hides toast with customTopOffset when closeToast is called', async () => {
    const toastOptions: ToastOptions = {
      variant: ToastVariants.Plain,
      labelOptions: [{ label: 'Offset toast' }],
      hasNoTimeout: true,
      customTopOffset: 24,
    };

    render(<Toast ref={toastRef} />);

    await act(async () => {
      toastRef.current?.showToast(toastOptions);
      jest.runAllTimers();
    });

    expect(screen.getByText('Offset toast')).toBeOnTheScreen();

    await act(async () => {
      toastRef.current?.closeToast();
      jest.runAllTimers();
    });

    expect(screen.queryByText('Offset toast')).toBeNull();
  });

  it('cancels pending toast when showToast is called rapidly in succession', async () => {
    const inProgressOptions: ToastOptions = {
      variant: ToastVariants.Plain,
      labelOptions: [{ label: 'In Progress' }],
      hasNoTimeout: true,
    };

    const successOptions: ToastOptions = {
      variant: ToastVariants.Plain,
      labelOptions: [{ label: 'Success' }],
      hasNoTimeout: false,
    };

    render(<Toast ref={toastRef} />);

    // Call showToast twice in the same tick (simulating approved + confirmed
    // firing before React processes the first state update).
    act(() => {
      toastRef.current?.showToast(inProgressOptions);
      toastRef.current?.showToast(successOptions);
    });

    // The first setTimeout(0) is cleared and replaced by the second call;
    // additional framework timers (e.g. Reanimated) may also be pending.
    expect(jest.getTimerCount()).toBeGreaterThanOrEqual(1);

    await act(async () => {
      jest.runAllTimers();
    });

    expect(screen.queryByText('In Progress')).toBeNull();
    expect(screen.getByText('Success')).toBeOnTheScreen();
  });

  describe('shouldTopAlignToastContent', () => {
    it('top-aligns below-the-text action buttons with a single-line description', () => {
      expect(
        shouldTopAlignToastContent({
          titleLineCount: 1,
          hasDescription: true,
          descriptionLineCount: 1,
          hasActionButton: true,
          hasTrailingTextButton: false,
        }),
      ).toBe(true);
    });

    it('top-aligns when description line count is greater than one', () => {
      expect(
        shouldTopAlignToastContent({
          titleLineCount: 1,
          hasDescription: true,
          descriptionLineCount: 2,
          hasActionButton: false,
          hasTrailingTextButton: false,
        }),
      ).toBe(true);
    });
  });

  describe('avatar variants', () => {
    it('renders account avatar for Account variant', async () => {
      render(<Toast ref={toastRef} />);
      const options: ToastOptions = {
        variant: ToastVariants.Account,
        accountAddress: TEST_ACCOUNT_ADDRESS,
        accountAvatarType: AvatarAccountType.JazzIcon,
        labelOptions: [{ label: 'Account toast' }],
        hasNoTimeout: true,
      };

      await showToast(toastRef, options);

      expect(screen.getByText('Account toast')).toBeOnTheScreen();
    });

    it('renders network avatar for Network variant', async () => {
      const view = render(<Toast ref={toastRef} />);
      const options: ToastOptions = {
        variant: ToastVariants.Network,
        networkName: TEST_NETWORK_NAME,
        networkImageSource: TEST_NETWORK_IMAGE_SOURCE,
        labelOptions: [{ label: 'Network toast' }],
        hasNoTimeout: true,
      };

      await showToast(toastRef, options);

      expect(screen.getByText('Network toast')).toBeOnTheScreen();
      expect(view.getByTestId(AVATARNETWORK_IMAGE_TESTID)).toBeOnTheScreen();
    });

    it('renders favicon avatar for App variant', async () => {
      const view = render(<Toast ref={toastRef} />);
      const options: ToastOptions = {
        variant: ToastVariants.App,
        appIconSource: TEST_APP_ICON_SOURCE,
        labelOptions: [{ label: 'App toast' }],
        hasNoTimeout: true,
      };

      await showToast(toastRef, options);

      expect(screen.getByText('App toast')).toBeOnTheScreen();
      expect(view.getByTestId(AVATARFAVICON_IMAGE_TESTID)).toBeOnTheScreen();
    });

    it('renders icon accessory for Icon variant without background', async () => {
      render(<Toast ref={toastRef} />);
      const options: ToastOptions = {
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        iconColor: IconColor.Success,
        backgroundColor: 'transparent',
        labelOptions: [{ label: 'Icon toast' }],
        hasNoTimeout: true,
      };

      await showToast(toastRef, options);

      expect(screen.getByText('Icon toast')).toBeOnTheScreen();
    });

    it('renders icon accessory with circular background for Icon variant', async () => {
      render(<Toast ref={toastRef} />);
      const options: ToastOptions = {
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        iconColor: IconColor.Success,
        backgroundColor: lightTheme.colors.success.muted,
        labelOptions: [{ label: 'Icon background toast' }],
        hasNoTimeout: true,
      };

      await showToast(toastRef, options);

      expect(screen.getByText('Icon background toast')).toBeOnTheScreen();
    });
  });

  describe('label and description rendering', () => {
    it('renders inline description from newline-separated label options', async () => {
      render(<Toast ref={toastRef} />);
      const options: ToastOptions = {
        variant: ToastVariants.Plain,
        labelOptions: [
          { label: 'Title line', isBold: true },
          { label: '\n' },
          { label: 'Description line' },
        ],
        hasNoTimeout: true,
      };

      await showToast(toastRef, options);

      expect(screen.getByText('Title line')).toBeOnTheScreen();
      expect(screen.getByText('Description line')).toBeOnTheScreen();
    });

    it('uses custom startAccessory instead of avatar', async () => {
      render(<Toast ref={toastRef} />);
      const options: ToastOptions = {
        variant: ToastVariants.Account,
        accountAddress: TEST_ACCOUNT_ADDRESS,
        accountAvatarType: AvatarAccountType.JazzIcon,
        labelOptions: [{ label: 'Custom accessory toast' }],
        hasNoTimeout: true,
        startAccessory: <View testID="custom-start-accessory" />,
      };

      await showToast(toastRef, options);

      expect(screen.getByTestId('custom-start-accessory')).toBeOnTheScreen();
      expect(screen.queryByTestId('avatar-JazzIcon')).toBeNull();
    });
  });

  describe('action and close buttons', () => {
    it('renders link action button and invokes onPress', async () => {
      const onPress = jest.fn();
      render(<Toast ref={toastRef} />);
      const options: ToastOptions = {
        variant: ToastVariants.Plain,
        labelOptions: [{ label: 'Action toast' }],
        linkButtonOptions: { label: 'Retry', onPress },
        hasNoTimeout: true,
      };

      await showToast(toastRef, options);

      fireEvent.press(screen.getByText('Retry'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('renders icon close button and invokes onPress', async () => {
      const onPress = jest.fn();
      const view = render(<Toast ref={toastRef} />);
      const options: ToastOptions = {
        variant: ToastVariants.Plain,
        labelOptions: [{ label: 'Close icon toast' }],
        closeButtonOptions: {
          variant: ButtonIconVariant.Icon,
          iconName: IconName.Close,
          onPress,
        },
        hasNoTimeout: true,
      };

      await showToast(toastRef, options);

      const [closeButton] = view.UNSAFE_getAllByType(TouchableOpacity);
      fireEvent.press(closeButton);

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it.each([
      [ButtonVariants.Primary, 'Done'],
      [ButtonVariants.Secondary, 'Track'],
      [ButtonVariants.Link, 'Dismiss'],
    ] as const)(
      'renders legacy %s close button and invokes onPress',
      async (variant, label) => {
        const onPress = jest.fn();
        render(<Toast ref={toastRef} />);
        const options: ToastOptions = {
          variant: ToastVariants.Plain,
          labelOptions: [{ label: `${label} close toast` }],
          closeButtonOptions: {
            variant,
            label,
            onPress,
          },
          hasNoTimeout: true,
        };

        await showToast(toastRef, options);

        fireEvent.press(screen.getByText(label));

        expect(onPress).toHaveBeenCalledTimes(1);
      },
    );
  });

  describe('layout and animation behavior', () => {
    it('replaces a visible toast after the replacement delay', async () => {
      render(<Toast ref={toastRef} />);
      const firstOptions: ToastOptions = {
        variant: ToastVariants.Plain,
        labelOptions: [{ label: 'First toast' }],
        hasNoTimeout: true,
      };
      const secondOptions: ToastOptions = {
        variant: ToastVariants.Plain,
        labelOptions: [{ label: 'Second toast' }],
        hasNoTimeout: false,
      };

      await showToast(toastRef, firstOptions);
      expect(screen.getByText('First toast')).toBeOnTheScreen();

      await act(async () => {
        toastRef.current?.showToast(secondOptions);
        jest.advanceTimersByTime(100);
      });

      expect(screen.queryByText('First toast')).toBeNull();

      await act(async () => {
        jest.runAllTimers();
      });

      expect(screen.getByText('Second toast')).toBeOnTheScreen();
    });

    it('keeps persistent toast visible after layout when hasNoTimeout is true', async () => {
      const view = render(<Toast ref={toastRef} />);
      const options: ToastOptions = {
        variant: ToastVariants.Plain,
        labelOptions: [{ label: 'Persistent toast' }],
        hasNoTimeout: true,
        customTopOffset: 12,
      };

      await showToast(toastRef, options);

      await act(async () => {
        triggerToastLayout(view);
        jest.runAllTimers();
      });

      expect(screen.getByText('Persistent toast')).toBeOnTheScreen();
    });

    it('auto-dismisses toast after layout when hasNoTimeout is false', async () => {
      const view = render(<Toast ref={toastRef} />);
      const options: ToastOptions = {
        variant: ToastVariants.Plain,
        labelOptions: [{ label: 'Auto dismiss toast' }],
        hasNoTimeout: false,
      };

      await showToast(toastRef, options);

      await act(async () => {
        triggerToastLayout(view);
        jest.runAllTimers();
      });

      expect(screen.queryByText('Auto dismiss toast')).toBeNull();
    });

    it('top-aligns labels after multi-line title and description layout events', async () => {
      const view = render(<Toast ref={toastRef} />);
      const onPress = jest.fn();
      const options: ToastOptions = {
        variant: ToastVariants.Plain,
        labelOptions: [
          { label: 'Wrapped title', isBold: true },
          { label: '\n' },
          { label: 'Wrapped description' },
        ],
        closeButtonOptions: {
          variant: ButtonIconVariant.Icon,
          iconName: IconName.Close,
          onPress,
        },
        hasNoTimeout: true,
      };

      await showToast(toastRef, options);

      fireEvent(screen.getByText('Wrapped title'), 'onTextLayout', {
        nativeEvent: { lines: [{ text: 'line 1' }, { text: 'line 2' }] },
      });
      fireEvent(screen.getByText('Wrapped description'), 'onTextLayout', {
        nativeEvent: { lines: [{ text: 'description line' }] },
      });

      const labelsContainer = screen.getByTestId(ToastSelectorsIDs.CONTAINER);
      const flat = StyleSheet.flatten(labelsContainer.props.style);

      expect(flat.justifyContent).toBe('flex-start');

      const [closeButton] = view.UNSAFE_getAllByType(TouchableOpacity);
      const closeButtonStyle = StyleSheet.flatten(closeButton.props.style);

      expect(closeButtonStyle.marginTop).toBeDefined();
    });

    it('does not restart auto-dismiss when text layout triggers a remeasure', async () => {
      const view = render(<Toast ref={toastRef} />);
      const options: ToastOptions = {
        variant: ToastVariants.Plain,
        labelOptions: [
          { label: 'Wrapped title', isBold: true },
          { label: '\n' },
          { label: 'Wrapped description' },
        ],
        descriptionOptions: { description: 'Extra description' },
        linkButtonOptions: { label: 'Retry', onPress: jest.fn() },
        hasNoTimeout: false,
      };

      await showToast(toastRef, options);

      await act(async () => {
        triggerToastLayout(view);
        jest.advanceTimersByTime(visibilityDuration - 500);
      });

      expect(screen.getByText('Wrapped title')).toBeOnTheScreen();

      fireEvent(screen.getByText('Wrapped title'), 'onTextLayout', {
        nativeEvent: { lines: [{ text: 'line 1' }, { text: 'line 2' }] },
      });
      fireEvent(screen.getByText('Wrapped description'), 'onTextLayout', {
        nativeEvent: { lines: [{ text: 'description line' }] },
      });
      fireEvent(screen.getByText('Extra description'), 'onTextLayout', {
        nativeEvent: { lines: [{ text: 'extra description line' }] },
      });

      await act(async () => {
        triggerToastLayout(view);
        jest.advanceTimersByTime(500);
        jest.runAllTimers();
      });

      expect(screen.queryByText('Wrapped title')).toBeNull();
    });
  });
});
