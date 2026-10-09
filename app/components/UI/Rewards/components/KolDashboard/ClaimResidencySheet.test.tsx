import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import ClaimResidencySheet from './ClaimResidencySheet';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('ClaimResidencySheet', () => {
  const defaultProps = {
    isVisible: true,
    onClose: jest.fn(),
    onConfirmUs: jest.fn(),
    onConfirmNonUs: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns nothing when hidden', () => {
    const { queryByTestId } = render(
      <ClaimResidencySheet {...defaultProps} isVisible={false} />,
    );

    expect(
      queryByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_SHEET),
    ).toBeNull();
  });

  it('renders the residency copy and Yes/No actions', () => {
    const { getByTestId } = render(<ClaimResidencySheet {...defaultProps} />);

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_TITLE),
    ).toHaveTextContent('rewards.kol.claim_residency_title');
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_DESCRIPTION),
    ).toHaveTextContent('rewards.kol.claim_residency_description');
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_YES),
    ).toBeOnTheScreen();
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_NO),
    ).toBeOnTheScreen();
  });

  it('confirms that the user is a US person', () => {
    const { getByTestId } = render(<ClaimResidencySheet {...defaultProps} />);

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_YES));

    expect(defaultProps.onConfirmUs).toHaveBeenCalledTimes(1);
  });

  it('confirms that the user is not a US person', () => {
    const { getByTestId } = render(<ClaimResidencySheet {...defaultProps} />);

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_NO));

    expect(defaultProps.onConfirmNonUs).toHaveBeenCalledTimes(1);
  });
});
