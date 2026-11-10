import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { usePerpsRebateQuote } from '../../hooks/usePerpsRebateQuote';
import PerpsRebateBanner, {
  PERPS_REBATE_BANNER_TEST_ID,
  PERPS_REBATE_BANNER_CONTAINER_TEST_ID,
} from './PerpsRebateBanner';

jest.mock('../../hooks/usePerpsRebateQuote', () => ({
  usePerpsRebateQuote: jest.fn(),
}));

jest.mock('../../../../hooks/useTooltipModal', () => ({
  __esModule: true,
  default: () => ({ openTooltipModal: jest.fn() }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

const mockUsePerpsRebateQuote = jest.mocked(usePerpsRebateQuote);

describe('PerpsRebateBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches and displays an eligible Perps rebate', () => {
    mockUsePerpsRebateQuote.mockReturnValue({
      data: { eligible: true, rebateBips: 500, reason: null },
    } as ReturnType<typeof usePerpsRebateQuote>);

    render(
      <PerpsRebateBanner
        coin="ETH"
        containerTwClassName="px-4 mb-3"
        direction="long"
        notionalUsd="100"
      />,
    );

    expect(mockUsePerpsRebateQuote).toHaveBeenCalledWith({
      coin: 'ETH',
      direction: 'long',
      notionalUsd: '100',
    });
    expect(
      screen.getByTestId(PERPS_REBATE_BANNER_CONTAINER_TEST_ID),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(PERPS_REBATE_BANNER_TEST_ID)).toBeOnTheScreen();
    expect(
      screen.getByText('rewards.rebate.banner:{"percent":5}'),
    ).toBeOnTheScreen();
  });

  it.each([
    undefined,
    { eligible: false, rebateBips: 500, reason: 'INELIGIBLE' },
    { eligible: true, rebateBips: 500, reason: 'REFERRAL_REQUIRED' },
    { eligible: true, rebateBips: 0, reason: null },
    { eligible: true, rebateBips: -500, reason: null },
  ])('renders nothing for a non-displayable quote', (data) => {
    mockUsePerpsRebateQuote.mockReturnValue({
      data,
    } as ReturnType<typeof usePerpsRebateQuote>);

    render(<PerpsRebateBanner containerTwClassName="px-4 mb-3" />);

    expect(
      screen.queryByTestId(PERPS_REBATE_BANNER_CONTAINER_TEST_ID),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(PERPS_REBATE_BANNER_TEST_ID),
    ).not.toBeOnTheScreen();
  });
});
