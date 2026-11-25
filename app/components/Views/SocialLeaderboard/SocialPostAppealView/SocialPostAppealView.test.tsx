import React from 'react';
import { AccessibilityInfo } from 'react-native';
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

// The appeal cannot fail until the Intercom hand-off exists (TSA-1668), so no
// real screen can be driven into the failure. Report it the moment an appeal
// is submitted to cover the banner. Move this into the component-view test once
// the hand-off can fail for real.
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
  let announceSpy: jest.SpyInstance;

  beforeEach(() => {
    announceSpy = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    announceSpy.mockRestore();
  });

  it('shows the "couldn’t send" banner when the appeal cannot be submitted, keeping what the viewer typed', () => {
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

  it('announces the "couldn’t send" banner to screen readers', () => {
    renderWithProvider(<SocialPostAppealView />);
    fillForm();

    fireEvent.press(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON),
    );

    expect(announceSpy).toHaveBeenCalledTimes(1);
    expect(announceSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        strings('social_leaderboard.post_appeal.error_title'),
      ),
    );
  });
});
