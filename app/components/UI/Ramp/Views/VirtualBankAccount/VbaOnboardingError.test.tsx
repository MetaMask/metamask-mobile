import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaOnboardingError, {
  type VbaOnboardingErrorVariant,
  VbaOnboardingErrorSelectorsIDs,
} from './VbaOnboardingError';

const mockGoBack = jest.fn();
const mockOnRetry = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

const variants = ['account_provisioning_error', 'error'] as const;

describe('VbaOnboardingError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnRetry.mockResolvedValue(undefined);
  });

  it.each(variants)(
    'renders the %s copy',
    (variant: VbaOnboardingErrorVariant) => {
      const { getByTestId, getByText } = renderWithProvider(
        <VbaOnboardingError variant={variant} onRetry={mockOnRetry} />,
      );

      expect(
        getByTestId(`${VbaOnboardingErrorSelectorsIDs.CONTAINER}-${variant}`),
      ).toBeOnTheScreen();
      expect(
        getByText(strings(`virtual_bank_account.${variant}.title`)),
      ).toBeOnTheScreen();
      expect(
        getByText(strings(`virtual_bank_account.${variant}.description`)),
      ).toBeOnTheScreen();
      expect(
        getByText(strings(`virtual_bank_account.${variant}.button`)),
      ).toBeOnTheScreen();
    },
  );

  it('calls onRetry when Try again is pressed', async () => {
    const { getByTestId } = renderWithProvider(
      <VbaOnboardingError
        variant="account_provisioning_error"
        onRetry={mockOnRetry}
      />,
    );

    fireEvent.press(getByTestId(VbaOnboardingErrorSelectorsIDs.RETRY_BUTTON));

    await waitFor(() => {
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });
  });

  it('navigates back from the header', () => {
    const { getByTestId } = renderWithProvider(
      <VbaOnboardingError variant="error" onRetry={mockOnRetry} />,
    );

    fireEvent.press(getByTestId(VbaOnboardingErrorSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
