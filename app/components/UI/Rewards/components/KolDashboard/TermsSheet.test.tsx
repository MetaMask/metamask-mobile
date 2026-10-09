import React from 'react';
import { Linking, Modal } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import TermsSheet from './TermsSheet';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import { KOL_TERMS_URL } from './rewardsUiFixtures';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../../../images/rewards/arrow-square-out.svg', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return function MockArrowSquareOutIcon() {
    return ReactActual.createElement(View, {
      testID: 'mock-arrow-square-out-icon',
    });
  };
});

const renderSheet = (
  props: Partial<React.ComponentProps<typeof TermsSheet>> = {},
) => render(<TermsSheet isVisible onClose={jest.fn()} {...props} />);

describe('TermsSheet', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns nothing when hidden', () => {
    const { queryByTestId } = renderSheet({ isVisible: false });

    expect(queryByTestId(KOL_DASHBOARD_SELECTORS.TERMS_SHEET)).toBeNull();
  });

  it('renders the title, description, and Learn more action when visible', () => {
    const { getByTestId } = renderSheet();

    expect(getByTestId(KOL_DASHBOARD_SELECTORS.TERMS_SHEET)).toBeOnTheScreen();
    expect(getByTestId(KOL_DASHBOARD_SELECTORS.TERMS_TITLE)).toHaveTextContent(
      'rewards.kol.terms_title',
    );
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.TERMS_DESCRIPTION),
    ).toHaveTextContent('rewards.kol.terms_description');
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.TERMS_LEARN_MORE),
    ).toBeOnTheScreen();
  });

  it('hosts the sheet in a full-screen transparent modal so the overlay covers the dashboard', () => {
    const { UNSAFE_getByType } = renderSheet();

    const modal = UNSAFE_getByType(Modal);

    expect(modal.props.transparent).toBe(true);
    expect(modal.props.visible).toBe(true);
  });

  it('opens the terms page when Learn more is pressed', () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.TERMS_LEARN_MORE));

    expect(Linking.openURL).toHaveBeenCalledWith(KOL_TERMS_URL);
  });
});
