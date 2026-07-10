import React from 'react';
import { fireEvent, screen, act } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import MoreWaysToFundBottomSheet from './MoreWaysToFundBottomSheet';
import { strings } from '../../../../locales/i18n';

const DIGITAL_WALLET_IDS = ['revolut_pay', 'google_pay', 'venmo'];
const REGIONAL_IDS = ['upi', 'pix', 'ideal'];

describe('MoreWaysToFundBottomSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () =>
    renderWithProvider(
      <MoreWaysToFundBottomSheet
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />,
    );

  it('renders the sheet title', () => {
    renderComponent();

    expect(
      screen.getByText(strings('onboarding_fund_wallet.more_ways_sheet_title')),
    ).toBeOnTheScreen();
  });

  it('renders the digital wallets and regional section headers', () => {
    renderComponent();

    expect(
      screen.getByText(
        strings('onboarding_fund_wallet.more_ways_section_digital_wallets'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('onboarding_fund_wallet.more_ways_section_regional'),
      ),
    ).toBeOnTheScreen();
  });

  it.each([...DIGITAL_WALLET_IDS, ...REGIONAL_IDS])(
    'renders an option row for %s',
    (id) => {
      renderComponent();

      expect(screen.getByTestId(`more-ways-option-${id}`)).toBeOnTheScreen();
    },
  );

  it('calls onSelect with the entry id when an option is pressed', async () => {
    renderComponent();

    await act(async () => {
      fireEvent.press(screen.getByTestId('more-ways-option-google_pay'));
    });

    expect(mockOnSelect).toHaveBeenCalledWith('google_pay');
  });

  it('calls onClose when the header close button is pressed', async () => {
    renderComponent();

    await act(async () => {
      fireEvent.press(screen.getByTestId('button-icon'));
    });

    expect(mockOnClose).toHaveBeenCalled();
  });
});
