import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import {
  MONEY_DEV_MIGRATION_DESTINATION_INPUT_TEST_ID,
  MONEY_DEV_MIGRATION_STATUS_TEST_ID,
  MONEY_DEV_RUN_MIGRATION_BUTTON_TEST_ID,
  MoneyUiDeveloperOptionsSection,
} from './MoneyUiDeveloperOptionsSection';
import { UserActionType } from '../../../../actions/user/types';
import {
  selectMoneyEarnBannerDismissedTokens,
  selectMoneyOnboardingSeen,
} from '../../../../reducers/user/selectors';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyOnboardingStepperAnimationEnabled } from '../../../../selectors/featureFlagController/moneyAccount';

const mockNavigate = jest.fn();
const mockMigrate = jest.fn();

interface MigrationParams {
  source: string;
  destination: string;
  onBeforePhase?: (phase: string) => Promise<void>;
}

jest.mock(
  '../../../../lib/Money/migration/MoneyAccountMigrationPocService',
  () => ({
    MoneyAccountMigrationPoc: {
      migrate: (params: MigrationParams) => mockMigrate(params),
    },
  }),
);

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockDispatch = jest.fn();
const mockUseSelector = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock('../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../util/theme');
  return {
    ...actual,
    useTheme: () => actual.mockTheme,
  };
});

jest.mock('../../../../selectors/featureFlagController/moneyAccount', () => ({
  selectMoneyOnboardingStepperAnimationEnabled: jest.fn(),
}));

const mockSetString = jest.fn((_str: string) => Promise.resolve());

jest.mock('../../../../core/ClipboardManager', () => ({
  __esModule: true,
  default: {
    setString: (str: string) => mockSetString(str),
  },
}));

const MOCK_ADDRESS = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
const MOCK_DESTINATION = '0x1111111111111111111111111111111111111111';

const confirmRunAlert = () => {
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    const action = buttons?.find(
      (button) => button.text === 'Run' || button.text === 'Continue',
    );
    action?.onPress?.();
  });
};

interface SelectorMockOptions {
  hasSeenMoneyOnboarding?: boolean;
  isOnboardingEnabled?: boolean;
  /** Pass `null` to simulate no money account being available. */
  moneyAccount?: { address: string } | null;
  earnBannerDismissedTokens?: Record<string, boolean>;
}

/**
 * Configures the useSelector mock to return appropriate values for each selector
 * used by MoneyUiDeveloperOptionsSection.
 *
 * Default: onboarding not seen, flag enabled, primary money account present with MOCK_ADDRESS.
 * Pass `moneyAccount: null` to simulate the account being unavailable.
 */
function setupSelectorMocks(options: SelectorMockOptions = {}) {
  const hasSeenMoneyOnboarding = options.hasSeenMoneyOnboarding ?? false;
  const isOnboardingEnabled = options.isOnboardingEnabled ?? true;
  // `null` means "no account", `undefined` (omitted) means use the default.
  const moneyAccount =
    options.moneyAccount === null
      ? undefined
      : (options.moneyAccount ?? { address: MOCK_ADDRESS });

  const earnBannerDismissedTokens = options.earnBannerDismissedTokens ?? {};

  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectMoneyOnboardingSeen) return hasSeenMoneyOnboarding;
    if (selector === selectMoneyOnboardingStepperAnimationEnabled)
      return isOnboardingEnabled;
    if (selector === selectPrimaryMoneyAccount) return moneyAccount;
    if (selector === selectMoneyEarnBannerDismissedTokens)
      return earnBannerDismissedTokens;
    return undefined;
  });
}

describe('MoneyUiDeveloperOptionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMigrate.mockResolvedValue(undefined);
    setupSelectorMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the "Money UI" heading', () => {
    const { getByText } = render(<MoneyUiDeveloperOptionsSection />);

    expect(getByText('Money UI')).toBeOnTheScreen();
  });

  describe('onboarding enabled state', () => {
    it('displays onboarding enabled as true when flag is on', () => {
      setupSelectorMocks({ isOnboardingEnabled: true });

      const { getByText } = render(<MoneyUiDeveloperOptionsSection />);

      expect(getByText('Onboarding enabled: true')).toBeOnTheScreen();
    });

    it('displays onboarding enabled as false when flag is off', () => {
      setupSelectorMocks({ isOnboardingEnabled: false });

      const { getByText } = render(<MoneyUiDeveloperOptionsSection />);

      expect(getByText('Onboarding enabled: false')).toBeOnTheScreen();
    });
  });

  describe('onboarding seen state', () => {
    it('displays onboarding seen as false when not seen', () => {
      setupSelectorMocks({ hasSeenMoneyOnboarding: false });

      const { getByText } = render(<MoneyUiDeveloperOptionsSection />);

      expect(getByText('Onboarding seen: false')).toBeOnTheScreen();
    });

    it('displays onboarding seen as true when seen', () => {
      setupSelectorMocks({ hasSeenMoneyOnboarding: true });

      const { getByText } = render(<MoneyUiDeveloperOptionsSection />);

      expect(getByText('Onboarding seen: true')).toBeOnTheScreen();
    });

    it('renders the reset button', () => {
      const { getByText } = render(<MoneyUiDeveloperOptionsSection />);

      expect(getByText('Reset onboarding screen')).toBeOnTheScreen();
    });

    it('dispatches setMoneyOnboardingSeen(false) when reset button is pressed', () => {
      setupSelectorMocks({ hasSeenMoneyOnboarding: true });

      const { getByText } = render(<MoneyUiDeveloperOptionsSection />);

      fireEvent.press(getByText('Reset onboarding screen'));

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: UserActionType.SET_MONEY_ONBOARDING_SEEN,
          payload: { seen: false },
        }),
      );
    });
  });

  describe('Earn banner dismissals', () => {
    it('displays the dismissed banner count', () => {
      setupSelectorMocks({
        earnBannerDismissedTokens: { '0x1-0xabc': true, '0xe708-0xdef': true },
      });

      const { getByText } = render(<MoneyUiDeveloperOptionsSection />);

      expect(getByText('Earn banners dismissed: 2')).toBeOnTheScreen();
    });

    it('dispatches clearMoneyEarnBannerDismissedTokens when the clear button is pressed', () => {
      setupSelectorMocks({
        earnBannerDismissedTokens: { '0x1-0xabc': true },
      });

      const { getByText } = render(<MoneyUiDeveloperOptionsSection />);

      fireEvent.press(getByText('Clear Earn banner dismissals'));

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: UserActionType.CLEAR_MONEY_EARN_BANNER_DISMISSED_TOKENS,
        }),
      );
    });
  });

  describe('Money Account Address', () => {
    it('displays the money account address when available', () => {
      const { getByText } = render(<MoneyUiDeveloperOptionsSection />);

      expect(
        getByText(`Money Account Address: ${MOCK_ADDRESS}`),
      ).toBeOnTheScreen();
    });

    it('displays N/A when the money account address is unavailable', () => {
      setupSelectorMocks({ moneyAccount: null });

      const { getByText } = render(<MoneyUiDeveloperOptionsSection />);

      expect(getByText('Money Account Address: N/A')).toBeOnTheScreen();
    });

    it('renders the copy address button', () => {
      const { getByText } = render(<MoneyUiDeveloperOptionsSection />);

      expect(getByText('Copy Money Account Address')).toBeOnTheScreen();
    });

    it('copies the address to clipboard when the copy button is pressed', async () => {
      const { getByText } = render(<MoneyUiDeveloperOptionsSection />);

      await act(async () => {
        fireEvent.press(getByText('Copy Money Account Address'));
      });

      expect(mockSetString).toHaveBeenCalledTimes(1);
      expect(mockSetString).toHaveBeenCalledWith(MOCK_ADDRESS);
    });

    it('does not copy to clipboard when the address is unavailable', async () => {
      setupSelectorMocks({ moneyAccount: null });

      const { getByText } = render(<MoneyUiDeveloperOptionsSection />);

      await act(async () => {
        fireEvent.press(getByText('Copy Money Account Address'));
      });

      expect(mockSetString).not.toHaveBeenCalled();
    });
  });

  describe('Money Account migration POC', () => {
    it('disables the run button when destination is empty', () => {
      const { getByTestId } = render(<MoneyUiDeveloperOptionsSection />);

      expect(
        getByTestId(MONEY_DEV_RUN_MIGRATION_BUTTON_TEST_ID),
      ).toBeDisabled();
    });

    it('does not call migrate when destination equals the money account', () => {
      confirmRunAlert();
      const { getByTestId } = render(<MoneyUiDeveloperOptionsSection />);

      fireEvent.changeText(
        getByTestId(MONEY_DEV_MIGRATION_DESTINATION_INPUT_TEST_ID),
        MOCK_ADDRESS,
      );
      fireEvent.press(getByTestId(MONEY_DEV_RUN_MIGRATION_BUTTON_TEST_ID));

      expect(mockMigrate).not.toHaveBeenCalled();
    });

    it('calls migrate with the money account source and typed destination', async () => {
      confirmRunAlert();
      const { getByTestId } = render(<MoneyUiDeveloperOptionsSection />);

      fireEvent.changeText(
        getByTestId(MONEY_DEV_MIGRATION_DESTINATION_INPUT_TEST_ID),
        MOCK_DESTINATION,
      );
      await act(async () => {
        fireEvent.press(getByTestId(MONEY_DEV_RUN_MIGRATION_BUTTON_TEST_ID));
      });

      expect(mockMigrate).toHaveBeenCalledWith({
        source: MOCK_ADDRESS,
        destination: MOCK_DESTINATION,
        onBeforePhase: expect.any(Function),
      });
      expect(getByTestId(MONEY_DEV_MIGRATION_STATUS_TEST_ID)).toHaveTextContent(
        'Migration finished',
      );
    });

    it('shows a blocking prompt for a migration phase', async () => {
      mockMigrate.mockImplementation(
        async ({ onBeforePhase }: MigrationParams) => {
          await onBeforePhase?.('collect-inventory');
        },
      );
      confirmRunAlert();
      const { getByTestId } = render(<MoneyUiDeveloperOptionsSection />);

      fireEvent.changeText(
        getByTestId(MONEY_DEV_MIGRATION_DESTINATION_INPUT_TEST_ID),
        MOCK_DESTINATION,
      );
      await act(async () => {
        fireEvent.press(getByTestId(MONEY_DEV_RUN_MIGRATION_BUTTON_TEST_ID));
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Migration phase: collect-inventory',
        'Tap Continue to start this phase.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Continue' }),
        ]),
        { cancelable: false },
      );
    });

    it('shows the migrate error message when migrate throws', async () => {
      confirmRunAlert();
      mockMigrate.mockRejectedValue(new Error('exit-batch-failed'));
      const { getByTestId } = render(<MoneyUiDeveloperOptionsSection />);

      fireEvent.changeText(
        getByTestId(MONEY_DEV_MIGRATION_DESTINATION_INPUT_TEST_ID),
        MOCK_DESTINATION,
      );
      await act(async () => {
        fireEvent.press(getByTestId(MONEY_DEV_RUN_MIGRATION_BUTTON_TEST_ID));
      });

      expect(getByTestId(MONEY_DEV_MIGRATION_STATUS_TEST_ID)).toHaveTextContent(
        'Migration failed: exit-batch-failed',
      );
    });

    it('does not call migrate when the alert is cancelled', () => {
      jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      const { getByTestId } = render(<MoneyUiDeveloperOptionsSection />);

      fireEvent.changeText(
        getByTestId(MONEY_DEV_MIGRATION_DESTINATION_INPUT_TEST_ID),
        MOCK_DESTINATION,
      );
      fireEvent.press(getByTestId(MONEY_DEV_RUN_MIGRATION_BUTTON_TEST_ID));

      expect(mockMigrate).not.toHaveBeenCalled();
    });
  });
});
