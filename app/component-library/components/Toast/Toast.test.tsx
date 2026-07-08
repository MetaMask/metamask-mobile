// Third party dependencies.
import React, { createRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { render, screen, act, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import Toast from './Toast';
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

const TEST_ACCOUNT_ADDRESS = '0x2990079bcdEe240329a520d2444386FC119da21a';
const TEST_NETWORK_NAME = 'Ethereum Mainnet';
const TEST_NETWORK_IMAGE_SOURCE = {
  uri: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880',
};
const TEST_APP_ICON_SOURCE = {
  uri: 'https://app.uniswap.org/favicon.ico',
};

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

const plainToast = (
  label: string,
  extra: Partial<Extract<ToastOptions, { variant: ToastVariants.Plain }>> = {},
): Extract<ToastOptions, { variant: ToastVariants.Plain }> => ({
  variant: ToastVariants.Plain,
  labelOptions: [{ label }],
  hasNoTimeout: true,
  ...extra,
});

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

  it('renders null before showToast is called', () => {
    const { toJSON } = render(<Toast ref={toastRef} />);
    expect(toJSON()).toBeNull();
  });

  it('renders labels, description, and centered layout', async () => {
    render(<Toast ref={toastRef} />);

    await showToast(toastRef, {
      variant: ToastVariants.Plain,
      labelOptions: [
        { label: 'First part ' },
        { label: 'bold part', isBold: true },
        { label: ' secondary', isBold: false },
      ],
      hasNoTimeout: true,
    });

    expect(screen.getByText('First part ')).toBeOnTheScreen();
    expect(screen.getByText('bold part')).toBeOnTheScreen();
    expect(screen.getByText(' secondary')).toBeOnTheScreen();

    await act(async () => {
      toastRef.current?.closeToast();
      jest.runAllTimers();
    });
    expect(screen.queryByText('First part ')).toBeNull();

    await showToast(
      toastRef,
      plainToast('Test Label', {
        customTopOffset: 24,
        descriptionOptions: { description: 'Test description' },
      }),
    );

    expect(screen.getByText('Test Label')).toBeOnTheScreen();
    expect(screen.getByText('Test description')).toBeOnTheScreen();

    const flat = StyleSheet.flatten(
      screen.getByTestId(ToastSelectorsIDs.CONTAINER).props.style,
    );
    expect(flat.justifyContent).toBe('center');

    await act(async () => {
      toastRef.current?.closeToast();
      jest.runAllTimers();
    });
    expect(screen.queryByText('Test Label')).toBeNull();
  });

  it('cancels pending toast when showToast is called rapidly in succession', async () => {
    render(<Toast ref={toastRef} />);

    act(() => {
      toastRef.current?.showToast(plainToast('In Progress'));
      toastRef.current?.showToast(
        plainToast('Success', { hasNoTimeout: false }),
      );
    });

    await act(async () => {
      jest.runAllTimers();
    });

    expect(screen.queryByText('In Progress')).toBeNull();
    expect(screen.getByText('Success')).toBeOnTheScreen();
  });

  it.each<[string, ToastOptions, string, string | undefined]>([
    [
      'Account',
      {
        variant: ToastVariants.Account,
        accountAddress: TEST_ACCOUNT_ADDRESS,
        accountAvatarType: AvatarAccountType.JazzIcon,
        labelOptions: [{ label: 'Account toast' }],
        hasNoTimeout: true,
      },
      'Account toast',
      undefined,
    ],
    [
      'Network',
      {
        variant: ToastVariants.Network,
        networkName: TEST_NETWORK_NAME,
        networkImageSource: TEST_NETWORK_IMAGE_SOURCE,
        labelOptions: [{ label: 'Network toast' }],
        hasNoTimeout: true,
      },
      'Network toast',
      AVATARNETWORK_IMAGE_TESTID,
    ],
    [
      'App',
      {
        variant: ToastVariants.App,
        appIconSource: TEST_APP_ICON_SOURCE,
        labelOptions: [{ label: 'App toast' }],
        hasNoTimeout: true,
      },
      'App toast',
      AVATARFAVICON_IMAGE_TESTID,
    ],
    [
      'Icon without background',
      {
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        iconColor: IconColor.Success,
        backgroundColor: 'transparent',
        labelOptions: [{ label: 'Icon toast' }],
        hasNoTimeout: true,
      },
      'Icon toast',
      undefined,
    ],
    [
      'Icon with background',
      {
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        iconColor: IconColor.Success,
        backgroundColor: lightTheme.colors.success.muted,
        labelOptions: [{ label: 'Icon background toast' }],
        hasNoTimeout: true,
      },
      'Icon background toast',
      undefined,
    ],
  ])('renders %s variant', async (_label, options, text, testId) => {
    const view = render(<Toast ref={toastRef} />);
    await showToast(toastRef, options);
    expect(screen.getByText(text)).toBeOnTheScreen();
    if (testId) {
      expect(view.getByTestId(testId)).toBeOnTheScreen();
    }
  });

  it('uses custom startAccessory instead of avatar', async () => {
    render(<Toast ref={toastRef} />);

    await showToast(toastRef, {
      variant: ToastVariants.Account,
      accountAddress: TEST_ACCOUNT_ADDRESS,
      accountAvatarType: AvatarAccountType.JazzIcon,
      labelOptions: [{ label: 'Custom accessory toast' }],
      hasNoTimeout: true,
      startAccessory: <View testID="custom-start-accessory" />,
    });

    expect(screen.getByTestId('custom-start-accessory')).toBeOnTheScreen();
    expect(screen.queryByTestId('avatar-JazzIcon')).toBeNull();
  });

  it.each([
    [
      'action',
      (onPress: jest.Mock) =>
        plainToast('Action toast', {
          linkButtonOptions: { label: 'Retry', onPress },
        }),
      (view: ReturnType<typeof render>) => screen.getByText('Retry'),
    ],
    [
      'icon close',
      (onPress: jest.Mock) =>
        plainToast('Close icon toast', {
          closeButtonOptions: {
            variant: ButtonIconVariant.Icon,
            iconName: IconName.Close,
            onPress,
          },
        }),
      (view: ReturnType<typeof render>) =>
        view.UNSAFE_getAllByType(TouchableOpacity)[0],
    ],
    [
      'primary close',
      (onPress: jest.Mock) =>
        plainToast('Primary close toast', {
          closeButtonOptions: {
            variant: ButtonVariants.Primary,
            label: 'Done',
            onPress,
          },
        }),
      () => screen.getByText('Done'),
    ],
    [
      'secondary close',
      (onPress: jest.Mock) =>
        plainToast('Secondary close toast', {
          closeButtonOptions: {
            variant: ButtonVariants.Secondary,
            label: 'Track',
            onPress,
          },
        }),
      () => screen.getByText('Track'),
    ],
    [
      'link close',
      (onPress: jest.Mock) =>
        plainToast('Link close toast', {
          closeButtonOptions: {
            variant: ButtonVariants.Link,
            label: 'Dismiss',
            onPress,
          },
        }),
      () => screen.getByText('Dismiss'),
    ],
  ] as const)(
    'renders %s button and invokes onPress',
    async (_label, buildOptions, getPressTarget) => {
      const onPress = jest.fn();
      const view = render(<Toast ref={toastRef} />);

      await showToast(toastRef, buildOptions(onPress));
      fireEvent.press(getPressTarget(view));
      expect(onPress).toHaveBeenCalledTimes(1);
    },
  );

  it('replaces a visible toast after the replacement delay', async () => {
    render(<Toast ref={toastRef} />);
    await showToast(toastRef, plainToast('First toast'));

    await act(async () => {
      toastRef.current?.showToast(
        plainToast('Second toast', { hasNoTimeout: false }),
      );
      jest.advanceTimersByTime(100);
      jest.runAllTimers();
    });

    expect(screen.queryByText('First toast')).toBeNull();
    expect(screen.getByText('Second toast')).toBeOnTheScreen();
  });

  it('handles layout animation for persistent and auto-dismiss toasts', async () => {
    const persistentView = render(<Toast ref={toastRef} />);
    await showToast(
      toastRef,
      plainToast('Persistent toast', { customBottomOffset: 12 }),
    );

    await act(async () => {
      triggerToastLayout(persistentView);
      jest.runAllTimers();
    });
    expect(screen.getByText('Persistent toast')).toBeOnTheScreen();

    const autoDismissRef = createRef<ToastRef>();
    const autoDismissView = render(<Toast ref={autoDismissRef} />);
    await showToast(
      autoDismissRef,
      plainToast('Auto dismiss toast', { hasNoTimeout: false }),
    );

    await act(async () => {
      triggerToastLayout(autoDismissView);
      jest.runAllTimers();
    });
    expect(screen.queryByText('Auto dismiss toast')).toBeNull();
  });

  it('top-aligns labels after multi-line title and description layout events', async () => {
    const view = render(<Toast ref={toastRef} />);

    await showToast(toastRef, {
      variant: ToastVariants.Plain,
      labelOptions: [
        { label: 'Wrapped title', isBold: true },
        { label: '\n' },
        { label: 'Wrapped description' },
      ],
      closeButtonOptions: {
        variant: ButtonIconVariant.Icon,
        iconName: IconName.Close,
        onPress: jest.fn(),
      },
      hasNoTimeout: true,
    });

    fireEvent(screen.getByText('Wrapped title'), 'onTextLayout', {
      nativeEvent: { lines: [{ text: 'line 1' }, { text: 'line 2' }] },
    });
    fireEvent(screen.getByText('Wrapped description'), 'onTextLayout', {
      nativeEvent: { lines: [{ text: 'description line' }] },
    });

    const flat = StyleSheet.flatten(
      screen.getByTestId(ToastSelectorsIDs.CONTAINER).props.style,
    );
    expect(flat.justifyContent).toBe('flex-start');
    expect(
      StyleSheet.flatten(
        view.UNSAFE_getAllByType(TouchableOpacity)[0].props.style,
      ).marginTop,
    ).toBeDefined();
  });
});
