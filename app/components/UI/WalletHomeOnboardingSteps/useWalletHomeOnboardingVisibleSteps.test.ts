import { renderHook } from '@testing-library/react-native';
import { useWalletHomeOnboardingVisibleSteps } from './useWalletHomeOnboardingVisibleSteps';

const mockSelectPushNotificationOsPromptRequested = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => (selector as () => boolean)(),
}));

jest.mock('../../../selectors/onboarding', () => ({
  selectPushNotificationOsPromptRequested: () =>
    mockSelectPushNotificationOsPromptRequested(),
}));

describe('useWalletHomeOnboardingVisibleSteps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes the notifications step when the OS push request has not happened', () => {
    mockSelectPushNotificationOsPromptRequested.mockReturnValue(false);

    const { result } = renderHook(() => useWalletHomeOnboardingVisibleSteps());

    expect(result.current.includeNotificationsStep).toBe(true);
    expect(result.current.steps.map((step) => step.kind)).toEqual([
      'fund',
      'trade',
      'notifications',
    ]);
  });

  it('drops the notifications step once the OS push request has happened', () => {
    mockSelectPushNotificationOsPromptRequested.mockReturnValue(true);

    const { result } = renderHook(() => useWalletHomeOnboardingVisibleSteps());

    expect(result.current.includeNotificationsStep).toBe(false);
    expect(result.current.steps.map((step) => step.kind)).toEqual([
      'fund',
      'trade',
    ]);
  });

  it('keeps a stable steps reference across re-renders', () => {
    mockSelectPushNotificationOsPromptRequested.mockReturnValue(false);

    const { result, rerender } = renderHook(() =>
      useWalletHomeOnboardingVisibleSteps(),
    );
    const firstSteps = result.current.steps;

    rerender({});

    expect(result.current.steps).toBe(firstSteps);
  });

  it('recomputes the steps when the flag flips mid-flow', () => {
    mockSelectPushNotificationOsPromptRequested.mockReturnValue(false);

    const { result, rerender } = renderHook(() =>
      useWalletHomeOnboardingVisibleSteps(),
    );
    expect(result.current.steps).toHaveLength(3);

    mockSelectPushNotificationOsPromptRequested.mockReturnValue(true);
    rerender({});

    expect(result.current.steps).toHaveLength(2);
  });
});
