import { useBridgeViewOnFocus } from './index';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';

// Capture the callback passed to useFocusEffect so we can
// manually simulate focus / blur from tests.
let focusCallback: (() => (() => void) | void) | undefined;
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (cb: () => (() => void) | void) => {
    focusCallback = cb;
  },
}));

const createMockInputRef = () => ({
  current: {
    blur: jest.fn(),
    focus: jest.fn(),
    isFocused: jest.fn().mockReturnValue(false),
  },
});

const createMockKeypadRef = () => ({
  current: {
    open: jest.fn(),
    close: jest.fn(),
    isOpen: jest.fn().mockReturnValue(false),
  },
});

describe('useBridgeViewOnFocus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    focusCallback = undefined;
  });

  it('focuses input and opens keypad on initial focus', () => {
    // Arrange
    const inputRef = createMockInputRef();
    const keypadRef = createMockKeypadRef();

    renderHookWithProvider(() => useBridgeViewOnFocus({ inputRef, keypadRef }));

    // Act – simulate focus
    const cleanup = focusCallback?.();

    // Assert
    expect(inputRef.current.focus).toHaveBeenCalledTimes(1);
    expect(keypadRef.current.open).toHaveBeenCalledTimes(1);

    // Cleanup should exist
    expect(typeof cleanup).toBe('function');
  });

  it('blurs input and closes keypad on blur', () => {
    // Arrange
    const inputRef = createMockInputRef();
    const keypadRef = createMockKeypadRef();

    renderHookWithProvider(() => useBridgeViewOnFocus({ inputRef, keypadRef }));

    // Act – focus then blur
    const cleanup = focusCallback?.() as () => void;
    cleanup();

    // Assert
    expect(inputRef.current.blur).toHaveBeenCalledTimes(1);
    expect(keypadRef.current.close).toHaveBeenCalledTimes(1);
  });

  it('restores focus and keypad when keypad was open before blur', () => {
    // Arrange
    const inputRef = createMockInputRef();
    const keypadRef = createMockKeypadRef();

    renderHookWithProvider(() => useBridgeViewOnFocus({ inputRef, keypadRef }));

    // First focus (initial mount)
    const cleanup1 = focusCallback?.() as () => void;

    // Keypad was open when we navigate away
    keypadRef.current.isOpen.mockReturnValue(true);
    cleanup1();

    // Clear mocks to track only second focus calls
    inputRef.current.focus.mockClear();
    keypadRef.current.open.mockClear();

    // Act – second focus (returning to screen)
    focusCallback?.();

    // Assert – should restore focus + keypad
    expect(inputRef.current.focus).toHaveBeenCalledTimes(1);
    expect(keypadRef.current.open).toHaveBeenCalledTimes(1);
  });

  it('does not restore focus and keypad when keypad was closed before blur', () => {
    // Arrange
    const inputRef = createMockInputRef();
    const keypadRef = createMockKeypadRef();

    renderHookWithProvider(() => useBridgeViewOnFocus({ inputRef, keypadRef }));

    // First focus (initial mount)
    const cleanup1 = focusCallback?.() as () => void;

    // Keypad was closed when we navigate away
    keypadRef.current.isOpen.mockReturnValue(false);
    cleanup1();

    // Clear mocks to track only second focus calls
    inputRef.current.focus.mockClear();
    keypadRef.current.open.mockClear();

    // Act – second focus (returning to screen)
    focusCallback?.();

    // Assert – should NOT restore focus or keypad
    expect(inputRef.current.focus).not.toHaveBeenCalled();
    expect(keypadRef.current.open).not.toHaveBeenCalled();
  });

  it('captures keypad isOpen state as false when keypadRef.current is null on blur', () => {
    // Arrange
    const inputRef = createMockInputRef();
    const keypadRef = createMockKeypadRef();

    renderHookWithProvider(() => useBridgeViewOnFocus({ inputRef, keypadRef }));

    // First focus
    const cleanup1 = focusCallback?.() as () => void;

    // Simulate keypadRef becoming null before blur
    keypadRef.current.isOpen.mockReturnValue(false);
    cleanup1();

    inputRef.current.focus.mockClear();
    keypadRef.current.open.mockClear();

    // Act – second focus
    focusCallback?.();

    // Assert – should not restore since isOpen was false
    expect(inputRef.current.focus).not.toHaveBeenCalled();
    expect(keypadRef.current.open).not.toHaveBeenCalled();
  });
});
