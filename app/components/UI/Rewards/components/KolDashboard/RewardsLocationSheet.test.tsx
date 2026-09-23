import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import RewardsLocationSheet from './RewardsLocationSheet';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('RewardsLocationSheet', () => {
  const defaultProps = {
    isVisible: true,
    onClose: jest.fn(),
    onConfirmYes: jest.fn(),
    onConfirmNo: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns nothing when hidden', () => {
    const { queryByTestId } = render(
      <RewardsLocationSheet {...defaultProps} isVisible={false} />,
    );

    expect(
      queryByTestId(KOL_DASHBOARD_SELECTORS.REWARDS_LOCATION_SHEET),
    ).toBeNull();
  });

  it('renders the location copy and both Yes/No actions', () => {
    const { getByTestId } = render(<RewardsLocationSheet {...defaultProps} />);

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.REWARDS_LOCATION_TITLE),
    ).toHaveTextContent('rewards.kol.rewards_location_title');
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.REWARDS_LOCATION_DESCRIPTION),
    ).toHaveTextContent('rewards.kol.rewards_location_description');
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.REWARDS_LOCATION_YES),
    ).toBeOnTheScreen();
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.REWARDS_LOCATION_NO),
    ).toBeOnTheScreen();
  });

  it('confirms that some activity was in the US', () => {
    const { getByTestId } = render(<RewardsLocationSheet {...defaultProps} />);

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.REWARDS_LOCATION_YES));

    expect(defaultProps.onConfirmYes).toHaveBeenCalledTimes(1);
  });

  it('confirms that no activity was in the US', () => {
    const { getByTestId } = render(<RewardsLocationSheet {...defaultProps} />);

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.REWARDS_LOCATION_NO));

    expect(defaultProps.onConfirmNo).toHaveBeenCalledTimes(1);
  });
});
