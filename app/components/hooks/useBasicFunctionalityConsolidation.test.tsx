import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react-native';

import { toast } from '@metamask/design-system-react-native';

import Routes from '../../constants/navigation/Routes';
import {
  selectMobileUxBftcConsolidationFlagEnabled,
  selectShouldShowBasicFunctionalityMigrationBottomSheet,
  selectShouldShowBasicFunctionalityMigrationToast,
} from '../../selectors/featureFlagController/basicFunctionalityConsolidation';
import { selectIsUnlocked } from '../../selectors/keyringController';
import {
  selectBasicFunctionalityEnabled,
  selectIsBasicFunctionalityConsolidatedEnabled,
} from '../../selectors/settings';
import { strings } from '../../../locales/i18n';
import {
  consolidateBasicFunctionality,
  dismissBasicFunctionalityMigrationNotification,
} from '../../actions/settings';
import {
  selectCompletedOnboardingSafely,
  useBasicFunctionalityConsolidation,
} from './useBasicFunctionalityConsolidation';

const mockDispatch = jest.fn(() => Promise.resolve());
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
  shouldShowBottomSheet = false,
  shouldShowToast = false,
}: {
  isFlagEnabled?: boolean;
  isConsolidated?: boolean;
  isUnlocked?: boolean;
  basicFunctionalityEnabled?: boolean;
  completedOnboarding?: boolean;
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

  it('opens the migration bottom sheet when scheduled', () => {
    setSelectorValues({ shouldShowBottomSheet: true });

    renderHook(() => useBasicFunctionalityConsolidation());

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY_MIGRATION,
    });
  });

  it('shows a persistent migration toast titled for the settings change', () => {
    setSelectorValues({ shouldShowToast: true });

    renderHook(() => useBasicFunctionalityConsolidation());

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: strings('basic_functionality_migration.title'),
        hasNoTimeout: true,
      }),
    );
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

  it('dismisses the notification when the toast is closed', () => {
    setSelectorValues({ shouldShowToast: true });

    renderHook(() => useBasicFunctionalityConsolidation());

    mockToast.mock.calls[0][0].onClose();

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
});
