import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SocialPostAppealView from './SocialPostAppealView';
import { SocialPostAppealViewSelectorsIDs } from './SocialPostAppealView.testIds';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
    dispatch: jest.fn(),
    getState: () => ({ index: 1 }),
  }),
  useRoute: () => ({
    params: {
      kind: 'post-removed',
      handle: 'alphawhale',
      reason: 'Promises guaranteed returns',
    },
  }),
}));

// Support only fails to open on a broken navigator, which no real screen can
// be driven into: report the failure the moment an appeal is submitted.
jest.mock('../../../UI/SocialFeed/hooks/useSubmitSocialAppeal', () => ({
  useSubmitSocialAppeal:
    ({ onFailed }: { onFailed: () => void }) =>
    () =>
      onFailed(),
}));

const fillForm = () => {
  fireEvent.changeText(
    screen.getByTestId(SocialPostAppealViewSelectorsIDs.EMAIL_INPUT),
    'alex@example.com',
  );
  fireEvent.changeText(
    screen.getByTestId(SocialPostAppealViewSelectorsIDs.MESSAGE_INPUT),
    'I appeal.',
  );
};

describe('SocialPostAppealView', () => {
  it('shows the "couldn’t send" banner when support cannot open, keeping what the viewer typed', () => {
    renderWithProvider(<SocialPostAppealView />);
    fillForm();

    fireEvent.press(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON),
    );

    const banner = screen.getByTestId(
      SocialPostAppealViewSelectorsIDs.ERROR_BANNER,
    );
    expect(
      within(banner).getByText(
        strings('social_leaderboard.post_appeal.error_title'),
      ),
    ).toBeOnTheScreen();
    expect(
      within(banner).getByText(
        strings('social_leaderboard.post_appeal.error_description'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.MESSAGE_INPUT).props
        .value,
    ).toBe('I appeal.');
  });

  it('lets the viewer dismiss the banner', () => {
    renderWithProvider(<SocialPostAppealView />);
    fillForm();
    fireEvent.press(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON),
    );

    fireEvent.press(
      screen.getByLabelText(
        strings('social_leaderboard.post_appeal.error_dismiss'),
      ),
    );

    expect(
      screen.queryByTestId(SocialPostAppealViewSelectorsIDs.ERROR_BANNER),
    ).not.toBeOnTheScreen();
  });

  it('clears the banner once the viewer edits the message', () => {
    renderWithProvider(<SocialPostAppealView />);
    fillForm();
    fireEvent.press(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON),
    );

    fireEvent.changeText(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.MESSAGE_INPUT),
      'I appeal, again.',
    );

    expect(
      screen.queryByTestId(SocialPostAppealViewSelectorsIDs.ERROR_BANNER),
    ).not.toBeOnTheScreen();
  });
});
