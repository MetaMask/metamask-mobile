import React, { type PropsWithChildren } from 'react';
import { act, renderHook } from '@testing-library/react-native';

import { ToastContext } from '../../component-library/components/Toast';
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
import { useBasicFunctionalityConsolidation } from './useBasicFunctionalityConsolidation';

const mockDispatch = jest.fn(() => Promise.resolve());
const mockNavigate = jest.fn();
const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockConsolidateAction = jest.fn();
const mockDismissAction = { type: 'DISMISS_BFT_MIGRATION' };
let mockSelectorValues = new Map<unknown, unknown>();

jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) =>
    mockSelectorValues.has(selector) ? mockSelectorValues.get(selector) : true,
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

const toastRef = {
  current: {
    showToast: mockShowToast,
    closeToast: mockCloseToast,
  },
};

const wrapper = ({ children }: PropsWithChildren) => (
  <ToastContext.Provider value={{ toastRef }}>{children}</ToastContext.Provider>
);

function setSelectorValues({
  isFlagEnabled = true,
  isConsolidated = true,
  isUnlocked = true,
  basicFunctionalityEnabled = true,
  shouldShowBottomSheet = false,
  shouldShowToast = false,
}: {
  isFlagEnabled?: boolean;
  isConsolidated?: boolean;
  isUnlocked?: boolean;
  basicFunctionalityEnabled?: boolean;
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

    renderHook(() => useBasicFunctionalityConsolidation(), { wrapper });

    expect(consolidateBasicFunctionality).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(mockConsolidateAction);
  });

  it('opens the migration bottom sheet when scheduled', () => {
    setSelectorValues({ shouldShowBottomSheet: true });

    renderHook(() => useBasicFunctionalityConsolidation(), { wrapper });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY_MIGRATION,
    });
  });

  it('shows the migration toast and links to Privacy settings', async () => {
    setSelectorValues({ shouldShowToast: true });

    renderHook(() => useBasicFunctionalityConsolidation(), { wrapper });

    const toastOptions = mockShowToast.mock.calls[0][0];

    await act(async () => {
      toastOptions.linkButtonOptions.onPress();
    });

    expect(dismissBasicFunctionalityMigrationNotification).toHaveBeenCalled();
    expect(mockCloseToast).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.SECURITY_SETTINGS,
    });
  });

  it('describes Basic Functionality as enabled when the wallet lands on', () => {
    setSelectorValues({ shouldShowToast: true });

    renderHook(() => useBasicFunctionalityConsolidation(), { wrapper });

    expect(mockShowToast.mock.calls[0][0].descriptionOptions.description).toBe(
      strings('basic_functionality_migration.toast_description'),
    );
  });

  it('describes Basic Functionality as disabled when the wallet lands off', () => {
    setSelectorValues({
      shouldShowToast: true,
      basicFunctionalityEnabled: false,
    });

    renderHook(() => useBasicFunctionalityConsolidation(), { wrapper });

    expect(mockShowToast.mock.calls[0][0].descriptionOptions.description).toBe(
      strings('basic_functionality_migration.toast_description_disabled'),
    );
  });

  it('withholds the toast while locked and presents it after unlock', () => {
    setSelectorValues({ shouldShowToast: true, isUnlocked: false });

    const { rerender } = renderHook(
      () => useBasicFunctionalityConsolidation(),
      { wrapper },
    );

    expect(mockShowToast).not.toHaveBeenCalled();

    setSelectorValues({ shouldShowToast: true, isUnlocked: true });
    rerender(undefined);

    expect(mockShowToast).toHaveBeenCalledTimes(1);
  });

  it('withholds the bottom sheet while locked and presents it after unlock', () => {
    setSelectorValues({ shouldShowBottomSheet: true, isUnlocked: false });

    const { rerender } = renderHook(
      () => useBasicFunctionalityConsolidation(),
      { wrapper },
    );

    expect(mockNavigate).not.toHaveBeenCalled();

    setSelectorValues({ shouldShowBottomSheet: true, isUnlocked: true });
    rerender(undefined);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY_MIGRATION,
    });
  });
});
