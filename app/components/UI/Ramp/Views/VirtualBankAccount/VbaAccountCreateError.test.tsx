import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaAccountCreateError, {
  VbaAccountCreateErrorSelectorsIDs,
} from './VbaAccountCreateError';
import { VbaOnboardingErrorSelectorsIDs } from '../../../KYC/components/OnboardingError';

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

describe('VbaAccountCreateError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnPrimary.mockResolvedValue(undefined);
    mockOnSecondary.mockResolvedValue(undefined);
  });

  it('shows the unverified-details actions', () => {
    const { getByText, queryByTestId } = renderWithProvider(
      <VbaAccountCreateError
        variant="details"
        primaryActionType="contactSupport"
        onPrimary={mockOnPrimary}
        onSecondary={mockOnSecondary}
      />,
    );

    expect(
      getByText(
        strings('virtual_bank_account.account_create_error.details.title'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings(
          'virtual_bank_account.account_create_error.details.description',
        ),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('virtual_bank_account.account_create_error.details.primary'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('virtual_bank_account.account_create_error.details.secondary'),
      ),
    ).toBeOnTheScreen();
    expect(queryByTestId(VbaOnboardingErrorSelectorsIDs.LIST)).toBeNull();
  });

  it('shows the retry actions', () => {
    const { getByText } = renderWithProvider(
      <VbaAccountCreateError
        variant="generic"
        primaryActionType="retry"
        onPrimary={mockOnPrimary}
        onSecondary={mockOnSecondary}
      />,
    );

    expect(
      getByText(
        strings('virtual_bank_account.account_create_error.generic.title'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings(
          'virtual_bank_account.account_create_error.generic.description',
        ),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('virtual_bank_account.account_create_error.generic.primary'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('virtual_bank_account.account_create_error.generic.secondary'),
      ),
    ).toBeOnTheScreen();
  });

  it('shows contact support for a generic account setup failure', () => {
    const { getByText, queryByText } = renderWithProvider(
      <VbaAccountCreateError
        variant="generic"
        primaryActionType="contactSupport"
        onPrimary={mockOnPrimary}
        onSecondary={mockOnSecondary}
      />,
    );

    expect(
      getByText(
        strings('virtual_bank_account.account_create_error.details.primary'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings(
          'virtual_bank_account.account_create_error.details.description',
        ),
      ),
    ).toBeOnTheScreen();
    expect(
      queryByText(
        strings('virtual_bank_account.account_create_error.generic.primary'),
      ),
    ).not.toBeOnTheScreen();
    expect(
      queryByText(
        strings(
          'virtual_bank_account.account_create_error.generic.description',
        ),
      ),
    ).not.toBeOnTheScreen();
  });

  it('calls the primary and secondary actions', async () => {
    const { getByTestId } = renderWithProvider(
      <VbaAccountCreateError
        variant="generic"
        primaryActionType="retry"
        onPrimary={mockOnPrimary}
        onSecondary={mockOnSecondary}
        onBack={mockOnBack}
      />,
    );

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
});
