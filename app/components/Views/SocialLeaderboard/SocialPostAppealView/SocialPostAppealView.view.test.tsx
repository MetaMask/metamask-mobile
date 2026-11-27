/**
 * Component-view coverage for the moderation appeal form: the empty and
 * filled form, the email error, the request to the social API, the
 * confirmation, and the "couldn't send" banner.
 *
 * Run with:
 * yarn jest -c jest.config.view.js app/components/Views/SocialLeaderboard/SocialPostAppealView/SocialPostAppealView.view.test.tsx --runInBand --silent --coverage=false
 */

import '../../../../../tests/component-view/mocks';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { getRouteProbeTestId } from '../../../../../tests/component-view/render';
import { renderSocialPostAppealView } from '../../../../../tests/component-view/renderers/socialLeaderboard';
import Routes from '../../../../constants/navigation/Routes';
import AppConstants from '../../../../core/AppConstants';
import { SocialPostAppealViewSelectorsIDs } from './SocialPostAppealView.testIds';
import type { SocialPostAppealViewParams } from './SocialPostAppealView.types';

const APPEAL_PARAMS: SocialPostAppealViewParams = {
  kind: 'post-removed',
  handle: 'alphawhale',
  reason: 'Promises guaranteed returns',
};

const APPEAL_ROUTES = [{ name: Routes.NOTIFICATIONS.VIEW }];

const mockFetch = jest.fn();

const respondWith = (status: number, body: unknown = {}) =>
  mockFetch.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });

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
    mockFetch.mockReset();
    respondWith(201, { ticketId: '42' });
    global.fetch = mockFetch;
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

  it('opens the appeal ticket on the social API with the email, the message and the decision', async () => {
    renderSocialPostAppealView(APPEAL_PARAMS, APPEAL_ROUTES);
    await fillForm('alex@example.com', 'I think this is wrong.');

    fireEvent.press(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON),
    );
    await screen.findByTestId(SocialPostAppealViewSelectorsIDs.SUCCESS_TITLE);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(
      `${AppConstants.SOCIAL_API_URL.replace(/\/$/, '')}/api/v1/appeal`,
    );
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.email).toBe('alex@example.com');
    expect(body.description).toContain('I think this is wrong.');
    expect(body.description).toContain('post-removed');
    expect(body.description).toContain('alphawhale');
    expect(body.description).toContain('Promises guaranteed returns');
  });

  it('does not call the social API when the email is invalid', async () => {
    renderSocialPostAppealView(APPEAL_PARAMS, APPEAL_ROUTES);
    await fillForm('alex@example', 'I think this is wrong.');

    fireEvent.press(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON),
    );
    await screen.findByTestId(SocialPostAppealViewSelectorsIDs.EMAIL_ERROR);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends one request when Submit appeal is pressed twice before the first answer', async () => {
    renderSocialPostAppealView(APPEAL_PARAMS, APPEAL_ROUTES);
    await fillForm('alex@example.com', 'I appeal.');
    const submit = screen.getByTestId(
      SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON,
    );

    fireEvent.press(submit);
    fireEvent.press(submit);
    await screen.findByTestId(SocialPostAppealViewSelectorsIDs.SUCCESS_TITLE);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  describe('when the social API refuses the appeal', () => {
    const submitFailingAppeal = async () => {
      respondWith(429, { errorMessage: 'Too many appeals' });
      renderSocialPostAppealView(APPEAL_PARAMS, APPEAL_ROUTES);
      await fillForm('alex@example.com', 'I appeal.');
      fireEvent.press(
        screen.getByTestId(SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON),
      );
      return screen.findByTestId(SocialPostAppealViewSelectorsIDs.ERROR_BANNER);
    };

    it('shows the "couldn’t send" banner, keeping what the viewer typed', async () => {
      const banner = await submitFailingAppeal();

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
      expect(
        screen.queryByTestId(SocialPostAppealViewSelectorsIDs.SUCCESS_TITLE),
      ).not.toBeOnTheScreen();
    });

    it('announces the banner to screen readers', async () => {
      await submitFailingAppeal();

      expect(announceSpy).toHaveBeenCalledTimes(1);
      expect(announceSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          strings('social_leaderboard.post_appeal.error_title'),
        ),
      );
    });

    it('lets the viewer dismiss the banner', async () => {
      await submitFailingAppeal();

      fireEvent.press(
        screen.getByLabelText(
          strings('social_leaderboard.post_appeal.error_dismiss'),
        ),
      );

      expect(
        screen.queryByTestId(SocialPostAppealViewSelectorsIDs.ERROR_BANNER),
      ).not.toBeOnTheScreen();
    });

    it('clears the banner once the viewer edits the message', async () => {
      await submitFailingAppeal();

      fireEvent.changeText(
        screen.getByTestId(SocialPostAppealViewSelectorsIDs.MESSAGE_INPUT),
        'I appeal, again.',
      );

      expect(
        screen.queryByTestId(SocialPostAppealViewSelectorsIDs.ERROR_BANNER),
      ).not.toBeOnTheScreen();
    });

    it('lets the viewer submit again after a failure', async () => {
      await submitFailingAppeal();
      respondWith(201, { ticketId: '42' });

      fireEvent.press(
        screen.getByTestId(SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON),
      );

      expect(
        await screen.findByTestId(
          SocialPostAppealViewSelectorsIDs.SUCCESS_TITLE,
        ),
      ).toBeOnTheScreen();
    });
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
