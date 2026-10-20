import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { QuoteResponse } from '@metamask/bridge-controller';
import SwapsRebateBanner, {
  SWAPS_REBATE_BANNER_TEST_ID,
} from './SwapsRebateBanner';

const mockUseSwapsRebate = jest.fn();
jest.mock('../../hooks/useSwapsRebate', () => ({
  useSwapsRebate: (...args: unknown[]) => mockUseSwapsRebate(...args),
}));

jest.mock('../../../../hooks/useTooltipModal', () => ({
  __esModule: true,
  default: () => ({ openTooltipModal: jest.fn() }),
}));

const quote = { feeData: {} } as unknown as QuoteResponse['quote'];

describe('SwapsRebateBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches and displays the selected quote rebate', () => {
    mockUseSwapsRebate.mockReturnValue(5);

    render(<SwapsRebateBanner quote={quote} />);

    expect(mockUseSwapsRebate).toHaveBeenCalledWith(quote);
    expect(screen.getByTestId(SWAPS_REBATE_BANNER_TEST_ID)).toBeOnTheScreen();
  });

  it('renders nothing without an eligible rebate', () => {
    mockUseSwapsRebate.mockReturnValue(null);

    render(<SwapsRebateBanner quote={quote} />);

    expect(
      screen.queryByTestId(SWAPS_REBATE_BANNER_TEST_ID),
    ).not.toBeOnTheScreen();
  });
});
