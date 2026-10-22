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

  it('shows the blocked account actions', () => {
    const { getByText, queryByText } = renderWithProvider(
      <VbaAccountCreateError
        variant="blocked"
        onPrimary={mockOnPrimary}
        onSecondary={mockOnSecondary}
      />,
    );

    expect(
      getByText(
        strings('virtual_bank_account.account_create_error.blocked.title'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings(
          'virtual_bank_account.account_create_error.blocked.description',
        ),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('virtual_bank_account.account_create_error.blocked.primary'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('virtual_bank_account.account_create_error.blocked.secondary'),
      ),
    ).toBeOnTheScreen();
    expect(
      queryByText(
        strings(
          'virtual_bank_account.account_create_error.details.account_number_title',
        ),
      ),
    ).toBeNull();
  });

  it('shows the bank-detail checklist', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <VbaAccountCreateError variant="details" onPrimary={mockOnPrimary} />,
    );

    expect(getByTestId(VbaOnboardingErrorSelectorsIDs.LIST)).toBeOnTheScreen();
    expect(
      getByText(
        strings(
          'virtual_bank_account.account_create_error.details.routing_description',
        ),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('virtual_bank_account.account_create_error.details.primary'),
      ),
    ).toBeOnTheScreen();
  });

  it('calls the primary and secondary actions', async () => {
    const { getByTestId } = renderWithProvider(
      <VbaAccountCreateError
        variant="generic"
        onPrimary={mockOnPrimary}
        onSecondary={mockOnSecondary}
        onBack={mockOnBack}
      />,
    );

    fireEvent.press(
      getByTestId(VbaAccountCreateErrorSelectorsIDs.PRIMARY_BUTTON),
    );
    fireEvent.press(
      getByTestId(VbaAccountCreateErrorSelectorsIDs.SECONDARY_BUTTON),
    );
    fireEvent.press(getByTestId(VbaAccountCreateErrorSelectorsIDs.BACK_BUTTON));

    await waitFor(() => {
      expect(mockOnPrimary).toHaveBeenCalledTimes(1);
      expect(mockOnSecondary).toHaveBeenCalledTimes(1);
    });
    expect(mockOnBack).toHaveBeenCalledTimes(1);
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
