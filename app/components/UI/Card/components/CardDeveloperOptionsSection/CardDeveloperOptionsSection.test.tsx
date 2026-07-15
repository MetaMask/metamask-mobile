import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import CardDeveloperOptionsSection from './CardDeveloperOptionsSection';
import { resetOnboardingState } from '../../../../../core/redux/slices/card';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { selectIsMoneyAccountDelegatedForCard } from '../../../../../selectors/cardController';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';

jest.mock('../../../../../core/redux/slices/card', () => ({
  resetOnboardingState: jest.fn(() => ({ type: 'card/resetOnboardingState' })),
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../../../selectors/cardController', () => ({
  ...jest.requireActual('../../../../../selectors/cardController'),
  selectIsMoneyAccountDelegatedForCard: jest.fn(),
}));

jest.mock('../../../../../selectors/moneyAccountController', () => ({
  ...jest.requireActual('../../../../../selectors/moneyAccountController'),
  selectPrimaryMoneyAccount: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      CardController: {
        linkMoneyAccountCard: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockSelectIsMoneyAccountDelegatedForCard =
  selectIsMoneyAccountDelegatedForCard as unknown as jest.Mock;
const mockSelectPrimaryMoneyAccount =
  selectPrimaryMoneyAccount as unknown as jest.Mock;
const mockLinkMoneyAccountCard = Engine.context.CardController
  .linkMoneyAccountCard as jest.Mock;
const mockLoggerError = Logger.error as jest.Mock;

const MONEY_ACCOUNT_ADDRESS = '0xma000000000000000000000000000000000000aa';
const UNLINK_BUTTON_TEST_ID = 'card-dev-unlink-money-account-button';
const UNLINK_DISABLED_HINT_TEST_ID =
  'card-dev-unlink-money-account-disabled-hint';

const setSelectorState = ({
  isAlreadyDelegated,
  moneyAccountAddress = MONEY_ACCOUNT_ADDRESS,
}: {
  isAlreadyDelegated: boolean;
  moneyAccountAddress?: string | null;
}) => {
  mockSelectIsMoneyAccountDelegatedForCard.mockReturnValue(isAlreadyDelegated);
  mockSelectPrimaryMoneyAccount.mockReturnValue(
    moneyAccountAddress ? { address: moneyAccountAddress } : undefined,
  );
};

describe('CardDeveloperOptionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSelectorState({ isAlreadyDelegated: false });
    mockLinkMoneyAccountCard.mockResolvedValue(undefined);
  });

  describe('reset onboarding', () => {
    it('renders the Card heading', () => {
      const { getByText } = renderWithProvider(<CardDeveloperOptionsSection />);

      expect(getByText('Card')).toBeDefined();
    });

    it('renders the description text', () => {
      const { getByText } = renderWithProvider(<CardDeveloperOptionsSection />);

      expect(
        getByText(
          'Reset Card onboarding state to start the onboarding flow from the beginning.',
        ),
      ).toBeDefined();
    });

    it('renders the Reset Onboarding State button', () => {
      const { getByText } = renderWithProvider(<CardDeveloperOptionsSection />);

      expect(getByText('Reset Onboarding State')).toBeDefined();
    });

    it('dispatches resetOnboardingState when button is pressed', () => {
      const { getByText } = renderWithProvider(<CardDeveloperOptionsSection />);

      const button = getByText('Reset Onboarding State');
      fireEvent.press(button);

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(resetOnboardingState).toHaveBeenCalledTimes(1);
    });
  });

  describe('unlink Money Account from Card', () => {
    it('renders the unlink description and button', () => {
      setSelectorState({ isAlreadyDelegated: true });

      const { getByText, getByTestId } = renderWithProvider(
        <CardDeveloperOptionsSection />,
      );

      expect(
        getByText(
          /Revoke the USDC spending-limit allowance that authorises Card/,
        ),
      ).toBeDefined();
      expect(getByText('Unlink Money Account from Card')).toBeDefined();
      expect(getByTestId(UNLINK_BUTTON_TEST_ID)).toBeDefined();
    });

    it('disables the unlink button and shows the hint when the Money Account is not delegated', () => {
      setSelectorState({ isAlreadyDelegated: false });

      const { getByTestId } = renderWithProvider(
        <CardDeveloperOptionsSection />,
      );

      // Design-system Button forwards `isDisabled` to the underlying
      // Pressable via `accessibilityState.disabled` (and/or the raw
      // `disabled` prop). Mirror the canonical pattern from
      // `ClaimBanner.test.tsx`.
      const button = getByTestId(UNLINK_BUTTON_TEST_ID);
      expect(
        button.props.accessibilityState?.disabled ?? button.props.disabled,
      ).toBe(true);
      expect(getByTestId(UNLINK_DISABLED_HINT_TEST_ID)).toBeDefined();

      fireEvent.press(button);
      expect(mockLinkMoneyAccountCard).not.toHaveBeenCalled();
    });

    it('disables the unlink button when there is no primary Money Account address', () => {
      setSelectorState({
        isAlreadyDelegated: true,
        moneyAccountAddress: null,
      });

      const { getByTestId } = renderWithProvider(
        <CardDeveloperOptionsSection />,
      );

      const button = getByTestId(UNLINK_BUTTON_TEST_ID);
      expect(
        button.props.accessibilityState?.disabled ?? button.props.disabled,
      ).toBe(true);
      expect(getByTestId(UNLINK_DISABLED_HINT_TEST_ID)).toBeDefined();

      fireEvent.press(button);
      expect(mockLinkMoneyAccountCard).not.toHaveBeenCalled();
    });

    it('enables the unlink button and hides the hint when the Money Account is delegated', () => {
      setSelectorState({ isAlreadyDelegated: true });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <CardDeveloperOptionsSection />,
      );

      const button = getByTestId(UNLINK_BUTTON_TEST_ID);
      expect(
        button.props.accessibilityState?.disabled ??
          button.props.disabled ??
          false,
      ).toBe(false);
      expect(queryByTestId(UNLINK_DISABLED_HINT_TEST_ID)).toBeNull();
    });

    it('calls linkMoneyAccountCard with amount "0" when the unlink button is pressed', async () => {
      setSelectorState({ isAlreadyDelegated: true });

      const { getByTestId } = renderWithProvider(
        <CardDeveloperOptionsSection />,
      );

      fireEvent.press(getByTestId(UNLINK_BUTTON_TEST_ID));

      await waitFor(() => {
        expect(mockLinkMoneyAccountCard).toHaveBeenCalledTimes(1);
      });
      expect(mockLinkMoneyAccountCard).toHaveBeenCalledWith({
        moneyAccountAddress: MONEY_ACCOUNT_ADDRESS,
        delegationAmountHuman: '0',
      });
      expect(mockLoggerError).not.toHaveBeenCalled();
    });

    it('logs via Logger.error and does not propagate when linkMoneyAccountCard rejects', async () => {
      setSelectorState({ isAlreadyDelegated: true });
      const failure = new Error('post-approval refused');
      mockLinkMoneyAccountCard.mockRejectedValueOnce(failure);

      const { getByTestId } = renderWithProvider(
        <CardDeveloperOptionsSection />,
      );

      // Pressing must not throw, even though the underlying call rejects.
      expect(() =>
        fireEvent.press(getByTestId(UNLINK_BUTTON_TEST_ID)),
      ).not.toThrow();

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledTimes(1);
      });
      expect(mockLoggerError).toHaveBeenCalledWith(
        failure,
        'CardDeveloperOptionsSection: unlink Money Account failed',
      );
    });

    it('wraps non-Error rejections in an Error before passing them to Logger.error', async () => {
      setSelectorState({ isAlreadyDelegated: true });
      mockLinkMoneyAccountCard.mockRejectedValueOnce('boom');

      const { getByTestId } = renderWithProvider(
        <CardDeveloperOptionsSection />,
      );

      fireEvent.press(getByTestId(UNLINK_BUTTON_TEST_ID));

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledTimes(1);
      });
      const [loggedError, loggedContext] = mockLoggerError.mock.calls[0];
      expect(loggedError).toBeInstanceOf(Error);
      expect((loggedError as Error).message).toBe('boom');
      expect(loggedContext).toBe(
        'CardDeveloperOptionsSection: unlink Money Account failed',
      );
    });
  });
});
