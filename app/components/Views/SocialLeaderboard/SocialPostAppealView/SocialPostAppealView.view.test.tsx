/**
 * Component-view coverage for the moderation appeal form: the empty and
 * filled form, the email error, and the confirmation.
 *
 * TODO(TSA-1668): submitting only confirms receipt for now. Cover the Intercom
 * hand-off here once that PR lands.
 *
 * Run with:
 * yarn jest -c jest.config.view.js app/components/Views/SocialLeaderboard/SocialPostAppealView/SocialPostAppealView.view.test.tsx --runInBand --silent --coverage=false
 */

import '../../../../../tests/component-view/mocks';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { getRouteProbeTestId } from '../../../../../tests/component-view/render';
import { renderSocialPostAppealView } from '../../../../../tests/component-view/renderers/socialLeaderboard';
import Routes from '../../../../constants/navigation/Routes';
import { SocialPostAppealViewSelectorsIDs } from './SocialPostAppealView.testIds';
import type { SocialPostAppealViewParams } from './SocialPostAppealView.types';

const APPEAL_PARAMS: SocialPostAppealViewParams = {
  kind: 'post-removed',
  handle: 'alphawhale',
  reason: 'Promises guaranteed returns',
};

const APPEAL_ROUTES = [{ name: Routes.NOTIFICATIONS.VIEW }];

const fillForm = async (email: string, message: string) => {
  fireEvent.changeText(
    await screen.findByTestId(SocialPostAppealViewSelectorsIDs.EMAIL_INPUT),
    email,
  );
  fireEvent.changeText(
    screen.getByTestId(SocialPostAppealViewSelectorsIDs.MESSAGE_INPUT),
    message,
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

  it('starts empty, with the email hint and Submit appeal disabled', async () => {
    renderSocialPostAppealView(APPEAL_PARAMS, APPEAL_ROUTES);

    expect(
      await screen.findByText(strings('social_leaderboard.post_appeal.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.EMAIL_HELPER),
    ).toHaveTextContent(strings('social_leaderboard.post_appeal.email_helper'));
    expect(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON),
    ).toBeDisabled();
  });

  it('keeps Submit appeal disabled until both the email and the message are filled', async () => {
    renderSocialPostAppealView(APPEAL_PARAMS, APPEAL_ROUTES);

    fireEvent.changeText(
      await screen.findByTestId(SocialPostAppealViewSelectorsIDs.EMAIL_INPUT),
      'alex@example.com',
    );
    expect(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON),
    ).toBeDisabled();

    fireEvent.changeText(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.MESSAGE_INPUT),
      'I think this is wrong.',
    );
    expect(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON),
    ).toBeEnabled();
  });

  it('shows the email error instead of confirming when the email has no domain', async () => {
    renderSocialPostAppealView(APPEAL_PARAMS, APPEAL_ROUTES);
    await fillForm('alex@example', 'I think this is wrong.');

    fireEvent.press(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON),
    );

    expect(
      await screen.findByTestId(SocialPostAppealViewSelectorsIDs.EMAIL_ERROR),
    ).toHaveTextContent(strings('social_leaderboard.post_appeal.email_error'));
    expect(
      screen.queryByTestId(SocialPostAppealViewSelectorsIDs.SUCCESS_TITLE),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialPostAppealViewSelectorsIDs.EMAIL_HELPER),
    ).not.toBeOnTheScreen();
  });

  it('brings back the email hint when the viewer edits the email', async () => {
    renderSocialPostAppealView(APPEAL_PARAMS, APPEAL_ROUTES);
    await fillForm('alex@example', 'I think this is wrong.');
    fireEvent.press(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON),
    );
    await screen.findByTestId(SocialPostAppealViewSelectorsIDs.EMAIL_ERROR);

    fireEvent.changeText(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.EMAIL_INPUT),
      'alex@example.com',
    );

    expect(
      screen.queryByTestId(SocialPostAppealViewSelectorsIDs.EMAIL_ERROR),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.EMAIL_HELPER),
    ).toBeOnTheScreen();
  });

  it('announces the email error to screen readers each time Submit appeal is pressed', async () => {
    renderSocialPostAppealView(APPEAL_PARAMS, APPEAL_ROUTES);
    await fillForm('alex@example', 'I think this is wrong.');

    fireEvent.press(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON),
    );
    fireEvent.press(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON),
    );

    expect(announceSpy).toHaveBeenCalledTimes(2);
    expect(announceSpy).toHaveBeenCalledWith(
      strings('social_leaderboard.post_appeal.email_error'),
    );
  });

  it('labels the email and message inputs for screen readers', async () => {
    renderSocialPostAppealView(APPEAL_PARAMS, APPEAL_ROUTES);

    expect(
      await screen.findByLabelText(
        strings('social_leaderboard.post_appeal.email_label'),
      ),
    ).toBe(screen.getByTestId(SocialPostAppealViewSelectorsIDs.EMAIL_INPUT));
    expect(
      screen.getByLabelText(
        strings('social_leaderboard.post_appeal.message_label'),
      ),
    ).toBe(screen.getByTestId(SocialPostAppealViewSelectorsIDs.MESSAGE_INPUT));
  });

  it('confirms receipt of the appeal with the email it was sent for', async () => {
    renderSocialPostAppealView(APPEAL_PARAMS, APPEAL_ROUTES);
    await fillForm('alex@example.com', 'This breaks nothing & I appeal.');

    fireEvent.press(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON),
    );

    expect(
      await screen.findByTestId(SocialPostAppealViewSelectorsIDs.SUCCESS_TITLE),
    ).toHaveTextContent(
      strings('social_leaderboard.post_appeal.success_title'),
    );
    expect(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.SUCCESS_DESCRIPTION),
    ).toHaveTextContent(/alex@example\.com/);
  });

  it('takes the viewer to the notifications list with Done on the confirmation', async () => {
    renderSocialPostAppealView(APPEAL_PARAMS, APPEAL_ROUTES);
    await fillForm('alex@example.com', 'I appeal.');
    fireEvent.press(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON),
    );

    fireEvent.press(
      await screen.findByTestId(SocialPostAppealViewSelectorsIDs.DONE_BUTTON),
    );

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.NOTIFICATIONS.VIEW)),
    ).toBeOnTheScreen();
  });
});
