import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react-native';
import { Linking } from 'react-native';

import { toast } from '@metamask/design-system-react-native';

import Routes from '../../constants/navigation/Routes';
import {
  selectIsExistingSocialWalletRestore,
  selectMobileUxBftcConsolidationFlagEnabled,
  selectShouldRepairSocialLoginBasicFunctionality,
  selectShouldShowBasicFunctionalityMigrationBottomSheet,
  selectShouldShowBasicFunctionalityMigrationToast,
} from '../../selectors/featureFlagController/basicFunctionalityConsolidation';
import { selectIsUnlocked } from '../../selectors/keyringController';
import {
  selectBasicFunctionalityEnabled,
  selectIsBasicFunctionalityConsolidatedEnabled,
} from '../../selectors/settings';
import { strings } from '../../../locales/i18n';
import { BASIC_FUNCTIONALITY_MIGRATION_BLOG_POST_LINK } from '../UI/BasicFunctionality/BasicFunctionalityMigrationBottomSheet/BasicFunctionalityMigrationBottomSheet';
import {
  consolidateBasicFunctionality,
  dismissBasicFunctionalityMigrationNotification,
} from '../../actions/settings';
import {
  BasicFunctionalityMixedToastAction,
  selectCompletedOnboardingSafely,
  useBasicFunctionalityConsolidation,
} from './useBasicFunctionalityConsolidation';
import { MetaMetricsEvents } from '../../core/Analytics';

const mockDispatch = jest.fn(() => Promise.resolve());

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({ mockEvent: true });
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

jest.mock('./useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockNavigate = jest.fn();
const mockConsolidateAction = jest.fn();
const mockDismissAction = { type: 'DISMISS_BFT_MIGRATION' };
let mockSelectorValues = new Map<unknown, unknown>();

const mockToast = toast as unknown as jest.Mock & { dismiss: jest.Mock };

jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) =>
    mockSelectorValues.has(selector) ? mockSelectorValues.get(selector) : true,
}));

// Only the imperative `toast` entry point is stubbed; Text/TextButton stay real
// so the rendered description is asserted against the design system output.
jest.mock('@metamask/design-system-react-native', () => ({
  ...jest.requireActual('@metamask/design-system-react-native'),
  toast: Object.assign(jest.fn(), { dismiss: jest.fn() }),
}));

jest.mock('./useThunkDispatch', () => ({
  __esModule: true,
  default: () => mockDispatch,
}));

jest.mock('../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

jest.mock('../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      navigate: (...args: unknown[]) => mockNavigate(...args),
    },
  },
}));

jest.mock('../../actions/settings', () => ({
  consolidateBasicFunctionality: jest.fn(() => mockConsolidateAction),
  dismissBasicFunctionalityMigrationNotification: jest.fn(
    () => mockDismissAction,
  ),
}));

function setSelectorValues({
  isFlagEnabled = true,
  isConsolidated = true,
  isUnlocked = true,
  basicFunctionalityEnabled = true,
  completedOnboarding = true,
  isExistingSocialWalletRestore = false,
  shouldRepairSocialLogin = false,
  shouldShowBottomSheet = false,
  shouldShowToast = false,
}: {
  isFlagEnabled?: boolean;
  isConsolidated?: boolean;
  isUnlocked?: boolean;
  basicFunctionalityEnabled?: boolean;
  completedOnboarding?: boolean;
  isExistingSocialWalletRestore?: boolean;
  shouldRepairSocialLogin?: boolean;
  shouldShowBottomSheet?: boolean;
  shouldShowToast?: boolean;
} = {}) {
  mockSelectorValues.set(
    selectMobileUxBftcConsolidationFlagEnabled,
    isFlagEnabled,
  );
  mockSelectorValues.set(
    selectIsBasicFunctionalityConsolidatedEnabled,
    isConsolidated,
  );
  mockSelectorValues.set(selectIsUnlocked, isUnlocked);
  mockSelectorValues.set(selectCompletedOnboardingSafely, completedOnboarding);
  mockSelectorValues.set(
    selectIsExistingSocialWalletRestore,
    isExistingSocialWalletRestore,
  );
  mockSelectorValues.set(
    selectShouldRepairSocialLoginBasicFunctionality,
    shouldRepairSocialLogin,
  );
  mockSelectorValues.set(
    selectBasicFunctionalityEnabled,
    basicFunctionalityEnabled,
  );
  mockSelectorValues.set(
    selectShouldShowBasicFunctionalityMigrationBottomSheet,
    shouldShowBottomSheet,
  );
  mockSelectorValues.set(
    selectShouldShowBasicFunctionalityMigrationToast,
    shouldShowToast,
  );
}

describe('useBasicFunctionalityConsolidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectorValues = new Map();
  });

  it('runs the one-time migration for an eligible wallet', () => {
    setSelectorValues({ isConsolidated: false });

    renderHook(() => useBasicFunctionalityConsolidation());

    expect(consolidateBasicFunctionality).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(mockConsolidateAction);
  });

  it('runs migration as soon as the rollout flag turns on', () => {
    setSelectorValues({ isFlagEnabled: false, isConsolidated: false });

    const { rerender } = renderHook(() => useBasicFunctionalityConsolidation());

    expect(consolidateBasicFunctionality).not.toHaveBeenCalled();

    setSelectorValues({ isFlagEnabled: true, isConsolidated: false });
    rerender(undefined);

    expect(consolidateBasicFunctionality).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(mockConsolidateAction);
  });

  it('skips the migration for a wallet created during this session', () => {
    // Wallet creation flips `completedOnboarding` before the cohort is enrolled,
    // so a session that started pre-onboarding must never migrate.
    setSelectorValues({ isConsolidated: false, completedOnboarding: false });

    const { rerender } = renderHook(() => useBasicFunctionalityConsolidation());

    setSelectorValues({ isConsolidated: false, completedOnboarding: true });
    rerender(undefined);

    expect(consolidateBasicFunctionality).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('migrates a wallet restored by social rehydration in the same session', () => {
    // Rehydration runs inside onboarding but hands back an existing wallet that
    // onboarding never enrols, so it must not wait for the next launch.
    setSelectorValues({
      isConsolidated: false,
      completedOnboarding: false,
      isExistingSocialWalletRestore: true,
    });

    const { rerender } = renderHook(() => useBasicFunctionalityConsolidation());

    expect(consolidateBasicFunctionality).not.toHaveBeenCalled();

    setSelectorValues({
      isConsolidated: false,
      completedOnboarding: true,
      isExistingSocialWalletRestore: true,
    });
    rerender(undefined);

    expect(consolidateBasicFunctionality).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(mockConsolidateAction);
  });

  it('repairs a consolidated social-login wallet left with Basic Functionality off', () => {
    setSelectorValues({
      isConsolidated: true,
      basicFunctionalityEnabled: false,
      shouldRepairSocialLogin: true,
    });

    renderHook(() => useBasicFunctionalityConsolidation());

    expect(consolidateBasicFunctionality).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(mockConsolidateAction);
  });

  it('repairs a social-login wallet even when the session started in onboarding', () => {
    // The wallet is already enrolled, so the onboarding latch must not hold the
    // repair back to the next launch.
    setSelectorValues({
      isConsolidated: true,
      basicFunctionalityEnabled: false,
      completedOnboarding: false,
      shouldRepairSocialLogin: true,
    });

    const { rerender } = renderHook(() => useBasicFunctionalityConsolidation());

    setSelectorValues({
      isConsolidated: true,
      basicFunctionalityEnabled: false,
      completedOnboarding: true,
      shouldRepairSocialLogin: true,
    });
    rerender(undefined);

    expect(consolidateBasicFunctionality).toHaveBeenCalledTimes(1);
  });

  it('does not retry a repair that failed', async () => {
    // Nothing re-runs the repair until the next unlock, so a wallet whose
    // repair fails stays off for the rest of the session and needs the
    // Settings switch to recover.
    mockDispatch.mockReturnValueOnce(
      Promise.reject(new Error('repair failed')),
    );
    setSelectorValues({
      isConsolidated: true,
      basicFunctionalityEnabled: false,
      shouldRepairSocialLogin: true,
    });

    const { rerender } = renderHook(() => useBasicFunctionalityConsolidation());

    await act(async () => {
      await Promise.resolve();
    });

    rerender(undefined);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('leaves a consolidated wallet alone when no repair is needed', () => {
    setSelectorValues({ isConsolidated: true });

    renderHook(() => useBasicFunctionalityConsolidation());

    expect(consolidateBasicFunctionality).not.toHaveBeenCalled();
  });

  it('opens the migration bottom sheet when scheduled', () => {
    setSelectorValues({ shouldShowBottomSheet: true });

    renderHook(() => useBasicFunctionalityConsolidation());

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY_MIGRATION,
    });
  });

  it('opens the bottom sheet as soon as it is scheduled', () => {
    setSelectorValues({ shouldShowBottomSheet: false });

    const { rerender } = renderHook(() => useBasicFunctionalityConsolidation());

    expect(mockNavigate).not.toHaveBeenCalled();

    setSelectorValues({ shouldShowBottomSheet: true });
    rerender(undefined);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY_MIGRATION,
    });
  });

  it('shows a persistent migration toast titled for the settings change', () => {
    setSelectorValues({ shouldShowToast: true });

    renderHook(() => useBasicFunctionalityConsolidation());

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ hasNoTimeout: true }),
    );

    render(mockToast.mock.calls[0][0].title);

    expect(
      screen.getByText(strings('basic_functionality_migration.title')),
    ).toBeOnTheScreen();
  });

  it('keeps the description full width by closing from the title row', () => {
    setSelectorValues({ shouldShowToast: true });

    renderHook(() => useBasicFunctionalityConsolidation());

    const toastCall = mockToast.mock.calls[0][0];

    // A close button in the toast's own column would narrow every description
    // line, so the notice renders one inside the title instead.
    expect(toastCall.showCloseButton).toBe(false);
    render(toastCall.title);
    expect(
      screen.getByLabelText(strings('navigation.close')),
    ).toBeOnTheScreen();
  });

  it('shows the toast as soon as it is scheduled', () => {
    setSelectorValues({ shouldShowToast: false });

    const { rerender } = renderHook(() => useBasicFunctionalityConsolidation());

    expect(mockToast).not.toHaveBeenCalled();

    setSelectorValues({ shouldShowToast: true });
    rerender(undefined);

    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  it('shows a pending migration toast after the rollout is disabled', () => {
    setSelectorValues({
      isFlagEnabled: false,
      shouldShowToast: true,
    });

    renderHook(() => useBasicFunctionalityConsolidation());

    expect(consolidateBasicFunctionality).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalled();
  });

  it('links to Privacy settings from inside the description', async () => {
    setSelectorValues({ shouldShowToast: true });

    renderHook(() => useBasicFunctionalityConsolidation());

    render(mockToast.mock.calls[0][0].description);

    await act(async () => {
      fireEvent.press(
        screen.getByText(
          strings('basic_functionality_migration.settings_link'),
        ),
      );
    });

    expect(dismissBasicFunctionalityMigrationNotification).toHaveBeenCalled();
    expect(mockToast.dismiss).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.SECURITY_SETTINGS,
    });
  });

  it('opens the blog from Learn more without dismissing the notice', () => {
    const openURL = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined as never);
    setSelectorValues({ shouldShowToast: true });

    renderHook(() => useBasicFunctionalityConsolidation());

    render(mockToast.mock.calls[0][0].description);

    fireEvent.press(
      screen.getByText(
        strings('basic_functionality_migration.learn_more_link'),
      ),
    );

    expect(openURL).toHaveBeenCalledWith(
      BASIC_FUNCTIONALITY_MIGRATION_BLOG_POST_LINK,
    );
    expect(
      dismissBasicFunctionalityMigrationNotification,
    ).not.toHaveBeenCalled();
    openURL.mockRestore();
  });

  it('dismisses the notification when the toast is closed', () => {
    setSelectorValues({ shouldShowToast: true });

    renderHook(() => useBasicFunctionalityConsolidation());

    render(mockToast.mock.calls[0][0].title);
    fireEvent.press(screen.getByLabelText(strings('navigation.close')));

    expect(dismissBasicFunctionalityMigrationNotification).toHaveBeenCalled();
    expect(mockToast.dismiss).toHaveBeenCalled();
  });

  it('acknowledges the notice when the toaster calls onClose', () => {
    setSelectorValues({ shouldShowToast: true });

    renderHook(() => useBasicFunctionalityConsolidation());

    act(() => {
      mockToast.mock.calls[0][0].onClose();
    });

    expect(dismissBasicFunctionalityMigrationNotification).toHaveBeenCalled();
  });

  it('describes Basic Functionality as enabled when the wallet lands on', () => {
    setSelectorValues({ shouldShowToast: true });

    renderHook(() => useBasicFunctionalityConsolidation());

    render(mockToast.mock.calls[0][0].description);

    // Not exact: the inline settings link is part of the same paragraph.
    expect(screen.root).toHaveTextContent(
      strings('basic_functionality_migration.toast_description'),
      { exact: false },
    );
  });

  it('describes Basic Functionality as disabled when the wallet lands off', () => {
    setSelectorValues({
      shouldShowToast: true,
      basicFunctionalityEnabled: false,
    });

    renderHook(() => useBasicFunctionalityConsolidation());

    render(mockToast.mock.calls[0][0].description);

    expect(screen.root).toHaveTextContent(
      strings('basic_functionality_migration.toast_description_disabled'),
      { exact: false },
    );
  });

  it('withholds the toast while locked and presents it after unlock', () => {
    setSelectorValues({ shouldShowToast: true, isUnlocked: false });

    const { rerender } = renderHook(() => useBasicFunctionalityConsolidation());

    expect(mockToast).not.toHaveBeenCalled();

    setSelectorValues({ shouldShowToast: true, isUnlocked: true });
    rerender(undefined);

    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  it('hides the toast on lock without dismissing the notice', () => {
    setSelectorValues({ shouldShowToast: true });

    const { rerender } = renderHook(() => useBasicFunctionalityConsolidation());

    expect(mockToast).toHaveBeenCalledTimes(1);

    setSelectorValues({ shouldShowToast: true, isUnlocked: false });
    rerender(undefined);

    expect(mockToast.dismiss).toHaveBeenCalled();
    expect(
      dismissBasicFunctionalityMigrationNotification,
    ).not.toHaveBeenCalled();

    setSelectorValues({ shouldShowToast: true, isUnlocked: true });
    rerender(undefined);

    expect(mockToast).toHaveBeenCalledTimes(2);
  });

  it('withholds the bottom sheet while locked and presents it after unlock', () => {
    setSelectorValues({ shouldShowBottomSheet: true, isUnlocked: false });

    const { rerender } = renderHook(() => useBasicFunctionalityConsolidation());

    expect(mockNavigate).not.toHaveBeenCalled();

    setSelectorValues({ shouldShowBottomSheet: true, isUnlocked: true });
    rerender(undefined);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY_MIGRATION,
    });
  });

  it('tracks viewed when the mixed toast is shown', () => {
    setSelectorValues({
      shouldShowToast: true,
    });

    renderHook(() => useBasicFunctionalityConsolidation());

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.NOTICE_UPDATE_DISPLAYED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      name: 'bf_mixed_toast',
      action: BasicFunctionalityMixedToastAction.VIEWED,
    });
    expect(mockTrackEvent).toHaveBeenCalledWith({ mockEvent: true });
  });

  it('tracks open settings when the toast settings link is pressed', () => {
    setSelectorValues({
      shouldShowToast: true,
    });

    renderHook(() => useBasicFunctionalityConsolidation());

    mockTrackEvent.mockClear();
    mockAddProperties.mockClear();
    mockCreateEventBuilder.mockClear();

    const { getByText } = render(mockToast.mock.calls[0][0].description);
    fireEvent.press(
      getByText(strings('basic_functionality_migration.settings_link')),
    );

    expect(mockAddProperties).toHaveBeenCalledWith({
      name: 'bf_mixed_toast',
      action: BasicFunctionalityMixedToastAction.OPEN_SETTINGS,
    });
  });

  it('tracks dismiss when the toast is closed without opening settings', () => {
    setSelectorValues({
      shouldShowToast: true,
    });

    renderHook(() => useBasicFunctionalityConsolidation());

    const { getByLabelText } = render(mockToast.mock.calls[0][0].title);
    mockTrackEvent.mockClear();
    mockAddProperties.mockClear();
    mockCreateEventBuilder.mockClear();

    fireEvent.press(getByLabelText(strings('navigation.close')));

    expect(mockAddProperties).toHaveBeenCalledWith({
      name: 'bf_mixed_toast',
      action: BasicFunctionalityMixedToastAction.DISMISS,
    });
  });
});
