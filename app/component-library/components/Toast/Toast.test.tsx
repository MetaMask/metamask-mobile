// Third party dependencies.
import React, { createRef } from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, act } from '@testing-library/react-native';

// Internal dependencies.
import Toast, {
  hasTrailingTextButton,
  shouldTopAlignToastContent,
} from './Toast';
import { ButtonVariants } from '../Buttons/Button/Button.types';
import { IconName } from '../Icons/Icon';
import {
  ButtonIconVariant,
  ToastRef,
  ToastVariants,
  ToastOptions,
} from './Toast.types';
import { ToastSelectorsIDs } from './ToastModal.testIds';

// react-native-reanimated is already mocked globally via setUpTests() in testSetup.js

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

  it('renders correctly with default state', () => {
    const { toJSON } = render(<Toast ref={toastRef} />);
    expect(toJSON()).toBeDefined();
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

  it('hides toast when closeToast is called', async () => {
    const toastOptions: ToastOptions = {
      variant: ToastVariants.Plain,
      labelOptions: [{ label: 'Test Label' }],
      hasNoTimeout: true,
    };

    render(<Toast ref={toastRef} />);

    // Show toast first
    await act(async () => {
      toastRef.current?.showToast(toastOptions);
      jest.runAllTimers();
    });

    expect(screen.getByText('Test Label')).toBeOnTheScreen();

    // Close toast
    await act(async () => {
      toastRef.current?.closeToast();
      jest.runAllTimers();
    });

    expect(screen.queryByText('Test Label')).toBeNull();
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

  it('uses center justifyContent on labels container by default', async () => {
    const toastOptions: ToastOptions = {
      variant: ToastVariants.Plain,
      labelOptions: [{ label: 'Aligned label' }],
      hasNoTimeout: true,
    };

    render(<Toast ref={toastRef} />);

    await act(async () => {
      toastRef.current?.showToast(toastOptions);
      jest.runAllTimers();
    });

    const labelsContainer = screen.getByTestId(ToastSelectorsIDs.CONTAINER);
    const flat = StyleSheet.flatten(labelsContainer.props.style);

    expect(flat.justifyContent).toBe('center');
  });

  describe('shouldTopAlignToastContent', () => {
    it('keeps trailing text buttons vertically centered in the row', () => {
      expect(
        shouldTopAlignToastContent({
          titleLineCount: 1,
          hasDescription: true,
          descriptionLineCount: 1,
          hasActionButton: false,
          hasTrailingTextButton: true,
        }),
      ).toBe(false);

      expect(
        shouldTopAlignToastContent({
          titleLineCount: 2,
          hasDescription: true,
          descriptionLineCount: 1,
          hasActionButton: false,
          hasTrailingTextButton: true,
        }),
      ).toBe(false);
    });

    it('still top-aligns multi-line title and description without trailing text buttons', () => {
      expect(
        shouldTopAlignToastContent({
          titleLineCount: 2,
          hasDescription: true,
          descriptionLineCount: 1,
          hasActionButton: false,
          hasTrailingTextButton: false,
        }),
      ).toBe(true);
    });

    it('still top-aligns below-the-text action buttons with a single-line description', () => {
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
  });

  describe('hasTrailingTextButton', () => {
    it('returns true for label-based close buttons', () => {
      expect(
        hasTrailingTextButton({
          variant: ButtonVariants.Secondary,
          label: 'Track',
          onPress: jest.fn(),
        }),
      ).toBe(true);
    });

    it('returns false for icon close buttons', () => {
      expect(
        hasTrailingTextButton({
          variant: ButtonIconVariant.Icon,
          iconName: IconName.Close,
          onPress: jest.fn(),
        }),
      ).toBe(false);
    });
  });
});
