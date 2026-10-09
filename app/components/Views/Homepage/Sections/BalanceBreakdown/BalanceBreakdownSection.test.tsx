import React from 'react';
import { render } from '@testing-library/react-native';
import BalanceBreakdownSection, {
  BALANCE_BREAKDOWN_SECTION_TEST_ID,
} from './BalanceBreakdownSection';

const mockHomepageBalanceBreakdown = jest.fn();

jest.mock('../../components/HomepageBalanceBreakdown', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: unknown) => {
      mockHomepageBalanceBreakdown(props);
      return <View testID="homepage-balance-breakdown-mock" />;
    },
  };
});

describe('BalanceBreakdownSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the balance breakdown with section-local spacing', () => {
    const children = <></>;
    const { getByTestId } = render(
      <BalanceBreakdownSection accountGroupBalanceProps={{}} hideRows>
        {children}
      </BalanceBreakdownSection>,
    );

    expect(getByTestId(BALANCE_BREAKDOWN_SECTION_TEST_ID)).toHaveStyle({
      paddingBottom: 4,
    });
    expect(getByTestId('homepage-balance-breakdown-mock')).toBeOnTheScreen();
    expect(mockHomepageBalanceBreakdown).toHaveBeenCalledWith(
      expect.objectContaining({
        accountGroupBalanceProps: {},
        children,
        hideRows: true,
      }),
    );
  });
});
