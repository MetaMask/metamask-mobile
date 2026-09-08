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
import { selectIsBasicFunctionalityConsolidatedEnabled } from '../../selectors/settings';
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
const mockSelectorValues = new Map();

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
  shouldShowBottomSheet = false,
  shouldShowToast = false,
}: {
  isFlagEnabled?: boolean;
  isConsolidated?: boolean;
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
  mockSelectorValues.set(selectIsUnlocked, true);
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
    mockSelectorValues.clear();
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
});
