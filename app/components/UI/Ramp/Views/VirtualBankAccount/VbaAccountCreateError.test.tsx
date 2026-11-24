import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaAccountCreateError, {
  VbaAccountCreateErrorSelectorsIDs,
} from './VbaAccountCreateError';

type ErrorScreenProps = React.ComponentProps<typeof VbaAccountCreateError>;

const mockGoBack = jest.fn();
const mockOnPrimary = jest.fn();
const mockOnSecondary = jest.fn();
const mockOnBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

const renderError = (overrides: Partial<ErrorScreenProps> = {}) =>
  renderWithProvider(
    <VbaAccountCreateError
      variant="generic"
      primaryActionType="retry"
      onPrimary={mockOnPrimary}
      onSecondary={mockOnSecondary}
      {...overrides}
    />,
  );

describe('VbaAccountCreateError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnPrimary.mockResolvedValue(undefined);
    mockOnSecondary.mockResolvedValue(undefined);
  });

  it.each([
    ['details', 'contactSupport', 'details'],
    ['generic', 'retry', 'generic'],
    ['generic', 'contactSupport', 'details'],
  ] as const)(
    'shows %s copy with %s',
    (variant, primaryActionType, actionCopy) => {
      const { getByText } = renderError({ variant, primaryActionType });

      [
        strings(`virtual_bank_account.account_create_error.${variant}.title`),
        strings(
          `virtual_bank_account.account_create_error.${actionCopy}.description`,
        ),
        strings(
          `virtual_bank_account.account_create_error.${actionCopy}.primary`,
        ),
        strings(
          `virtual_bank_account.account_create_error.${variant}.secondary`,
        ),
      ].forEach((copy) => expect(getByText(copy)).toBeOnTheScreen());
    },
  );

  it('calls the primary and secondary actions', async () => {
    const { getByTestId } = renderError({ onBack: mockOnBack });

    fireEvent.press(
      getByTestId(VbaAccountCreateErrorSelectorsIDs.PRIMARY_BUTTON),
    );
    await waitFor(() => {
      expect(mockOnPrimary).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(
      getByTestId(VbaAccountCreateErrorSelectorsIDs.SECONDARY_BUTTON),
    );
    await waitFor(() => {
      expect(mockOnSecondary).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(getByTestId(VbaAccountCreateErrorSelectorsIDs.BACK_BUTTON));
    expect(mockOnBack).toHaveBeenCalledTimes(1);
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('uses navigation Back when no override is supplied', () => {
    const { getByTestId } = renderError();

    fireEvent.press(getByTestId(VbaAccountCreateErrorSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'primary',
      VbaAccountCreateErrorSelectorsIDs.PRIMARY_BUTTON,
      mockOnPrimary,
    ],
    [
      'secondary',
      VbaAccountCreateErrorSelectorsIDs.SECONDARY_BUTTON,
      mockOnSecondary,
    ],
  ] as const)(
    'locks every action while %s is pending',
    async (_label, pendingButtonId, pendingAction) => {
      let resolveAction: (() => void) | undefined;
      pendingAction.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveAction = resolve;
        }),
      );
      const { getByTestId } = renderError({ onBack: mockOnBack });
      const primary = getByTestId(
        VbaAccountCreateErrorSelectorsIDs.PRIMARY_BUTTON,
      );
      const secondary = getByTestId(
        VbaAccountCreateErrorSelectorsIDs.SECONDARY_BUTTON,
      );
      const back = getByTestId(VbaAccountCreateErrorSelectorsIDs.BACK_BUTTON);

      fireEvent.press(getByTestId(pendingButtonId));
      await waitFor(() => expect(back).toBeDisabled());
      fireEvent.press(primary);
      fireEvent.press(secondary);
      fireEvent.press(back);

      expect(mockOnPrimary).toHaveBeenCalledTimes(
        pendingAction === mockOnPrimary ? 1 : 0,
      );
      expect(mockOnSecondary).toHaveBeenCalledTimes(
        pendingAction === mockOnSecondary ? 1 : 0,
      );
      expect(mockOnBack).not.toHaveBeenCalled();

      await act(async () => resolveAction?.());
      await waitFor(() => {
        expect(primary).toBeEnabled();
        expect(secondary).toBeEnabled();
        expect(back).toBeEnabled();
      });
    },
  );
});
