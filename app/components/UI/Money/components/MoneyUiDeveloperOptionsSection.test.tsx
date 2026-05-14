import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { MoneyUiDeveloperOptionsSection } from './MoneyUiDeveloperOptionsSection';
import { UserActionType } from '../../../../actions/user/types';
import { selectMoneyOnboardingSeen } from '../../../../reducers/user/selectors';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';

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

const mockSetString = jest.fn((_str: string) => Promise.resolve());

jest.mock('../../../../core/ClipboardManager', () => ({
  __esModule: true,
  default: {
    setString: (str: string) => mockSetString(str),
  },
}));

const MOCK_ADDRESS = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';

interface SelectorMockOptions {
  hasSeenMoneyOnboarding?: boolean;
  /** Pass `null` to simulate no money account being available. */
  moneyAccount?: { address: string } | null;
}

/**
 * Configures the useSelector mock to return appropriate values for each selector
 * used by MoneyUiDeveloperOptionsSection.
 *
 * Default: onboarding not seen, primary money account present with MOCK_ADDRESS.
 * Pass `moneyAccount: null` to simulate the account being unavailable.
 */
function setupSelectorMocks(options: SelectorMockOptions = {}) {
  const hasSeenMoneyOnboarding = options.hasSeenMoneyOnboarding ?? false;
  // `null` means "no account", `undefined` (omitted) means use the default.
  const moneyAccount =
    options.moneyAccount === null
      ? undefined
      : (options.moneyAccount ?? { address: MOCK_ADDRESS });

  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectMoneyOnboardingSeen) return hasSeenMoneyOnboarding;
    if (selector === selectPrimaryMoneyAccount) return moneyAccount;
    return undefined;
  });
}

describe('MoneyUiDeveloperOptionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupSelectorMocks();
  });

  it('renders the "Money UI" heading', () => {
    const { getByText } = render(<MoneyUiDeveloperOptionsSection />);

    expect(getByText('Money UI')).toBeOnTheScreen();
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
});
