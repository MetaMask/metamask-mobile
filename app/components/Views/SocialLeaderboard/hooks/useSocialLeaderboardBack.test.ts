import { renderHook } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSocialLeaderboardBack } from './useSocialLeaderboardBack';
import Routes from '../../../../constants/navigation/Routes';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockCanGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
    canGoBack: mockCanGoBack,
  }),
  useFocusEffect: jest.fn(),
}));

const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
  typeof useFocusEffect
>;

// Captures the hardwareBackPress handler registered inside useFocusEffect so
// the tests can invoke it directly and assert it consumes the event.
let hardwareBackHandler: (() => boolean) | undefined;
const mockRemove = jest.fn();
let focusEffectCleanup: (() => void) | undefined;

const runFocusEffect = () => {
  const focusCallback = mockUseFocusEffect.mock.calls.at(-1)?.[0];
  const cleanup = focusCallback?.();
  focusEffectCleanup = typeof cleanup === 'function' ? cleanup : undefined;
};

describe('useSocialLeaderboardBack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hardwareBackHandler = undefined;
    focusEffectCleanup = undefined;
    mockCanGoBack.mockReturnValue(true);

    jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation((_event, handler) => {
        hardwareBackHandler = handler as () => boolean;
        return { remove: mockRemove };
      });

    // Run the focus-effect callback synchronously so the hardware listener is
    // registered, mirroring a focused screen.
    mockUseFocusEffect.mockImplementation((callback) => {
      const cleanup = callback();
      focusEffectCleanup = typeof cleanup === 'function' ? cleanup : undefined;
    });
  });

  it('goes back when there is a screen to pop', () => {
    mockCanGoBack.mockReturnValue(true);

    const { result } = renderHook(() => useSocialLeaderboardBack());
    result.current();

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to Wallet Home when nothing is beneath (stack root)', () => {
    mockCanGoBack.mockReturnValue(false);

    const { result } = renderHook(() => useSocialLeaderboardBack());
    result.current();

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS);
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('consumes the Android hardware back event and pops when possible', () => {
    mockCanGoBack.mockReturnValue(true);

    renderHook(() => useSocialLeaderboardBack());
    runFocusEffect();

    // Returning true is the load-bearing fix: it prevents the event bubbling to
    // the OS, which would otherwise close the app at the stack root.
    expect(hardwareBackHandler?.()).toBe(true);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('consumes the Android hardware back event and routes to Wallet Home at the stack root', () => {
    mockCanGoBack.mockReturnValue(false);

    renderHook(() => useSocialLeaderboardBack());
    runFocusEffect();

    expect(hardwareBackHandler?.()).toBe(true);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS);
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('removes the hardware back listener when the screen loses focus', () => {
    renderHook(() => useSocialLeaderboardBack());
    runFocusEffect();

    expect(BackHandler.addEventListener).toHaveBeenCalledWith(
      'hardwareBackPress',
      expect.any(Function),
    );

    focusEffectCleanup?.();

    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
