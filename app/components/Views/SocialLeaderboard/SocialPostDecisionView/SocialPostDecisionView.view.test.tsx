/**
 * Component-view coverage for the moderation decision screen: a removed post,
 * a hidden profile, and the outcomes of a post or profile the viewer reported.
 *
 * The decision comes from route params, the way the notification deeplink
 * delivers it.
 *
 * Run with:
 * yarn jest -c jest.config.view.js app/components/Views/SocialLeaderboard/SocialPostDecisionView/SocialPostDecisionView.view.test.tsx --runInBand --silent --coverage=false
 */

import '../../../../../tests/component-view/mocks';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
  getRouteProbeTestId,
} from '../../../../../tests/component-view/render';
import { renderSocialPostDecisionView } from '../../../../../tests/component-view/renderers/socialLeaderboard';
import Routes from '../../../../constants/navigation/Routes';
import AppConstants from '../../../../core/AppConstants';
import { SocialPostDecisionViewSelectorsIDs } from './SocialPostDecisionView.testIds';
import type {
  SocialDecisionKind,
  SocialPostDecisionViewParams,
} from './SocialPostDecisionView.types';

const HOUR_MS = 60 * 60 * 1000;

const POST_DECISION: SocialPostDecisionViewParams = {
  kind: 'post-removed',
  handle: 'alphawhale',
  text: '100x guaranteed by Friday. DM me to join the signal group.',
  reason: 'Promises guaranteed returns',
  postedAt: Date.now() - 2 * HOUR_MS,
  profileId: 'profile-1',
  verified: true,
};

const PROFILE_DECISION: SocialPostDecisionViewParams = {
  kind: 'profile-hidden',
  handle: 'alphawhale',
  reason: 'Uses another creator’s name and photo',
  profileId: 'profile-1',
  verified: true,
};

describe('SocialPostDecisionView', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('tells a poster which post was removed and why', async () => {
    renderSocialPostDecisionView(POST_DECISION);

    expect(
      await screen.findByText(
        strings('social_leaderboard.post_decision.post_removed.title'),
      ),
    ).toBeOnTheScreen();
    const preview = screen.getByTestId(
      SocialPostDecisionViewSelectorsIDs.POST_PREVIEW,
    );
    expect(within(preview).getByText('alphawhale')).toBeOnTheScreen();
    expect(
      within(preview).getByText(POST_DECISION.text ?? ''),
    ).toBeOnTheScreen();
    expect(
      within(preview).getByTestId(
        SocialPostDecisionViewSelectorsIDs.POST_PREVIEW_VERIFIED_BADGE,
      ),
    ).toBeOnTheScreen();
    expect(
      within(preview).getByTestId(
        SocialPostDecisionViewSelectorsIDs.POST_PREVIEW_AGE,
      ),
    ).toHaveTextContent(/2h/);
    expect(
      screen.getByTestId(SocialPostDecisionViewSelectorsIDs.REASON_VALUE),
    ).toHaveTextContent('Promises guaranteed returns');
    expect(
      screen.getByText(
        strings('social_leaderboard.post_decision.ai_disclosure'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialPostDecisionViewSelectorsIDs.PROFILE_PREVIEW),
    ).not.toBeOnTheScreen();
  });

  it('leaves out the age and the verified badge the link does not carry', async () => {
    renderSocialPostDecisionView({
      kind: 'post-removed',
      handle: 'alphawhale',
      text: 'hello',
      reason: 'Spam',
    });

    expect(
      await screen.findByTestId(
        SocialPostDecisionViewSelectorsIDs.POST_PREVIEW,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialPostDecisionViewSelectorsIDs.POST_PREVIEW_AGE),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        SocialPostDecisionViewSelectorsIDs.POST_PREVIEW_VERIFIED_BADGE,
      ),
    ).not.toBeOnTheScreen();
  });

  it('opens the terms of service in the device browser from the subtitle link', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    renderSocialPostDecisionView(POST_DECISION);

    fireEvent.press(
      await screen.findByTestId(SocialPostDecisionViewSelectorsIDs.TERMS_LINK),
    );

    expect(openURL).toHaveBeenCalledWith(AppConstants.URLS.TERMS_OF_USE_URL);
  });

  it('tells a poster their profile is hidden, with the profile card and no post', async () => {
    renderSocialPostDecisionView(PROFILE_DECISION);

    expect(
      await screen.findByText(
        strings('social_leaderboard.post_decision.profile_hidden.title'),
      ),
    ).toBeOnTheScreen();
    const card = screen.getByTestId(
      SocialPostDecisionViewSelectorsIDs.PROFILE_PREVIEW,
    );
    expect(within(card).getByText('alphawhale')).toBeOnTheScreen();
    expect(within(card).getByText('@alphawhale')).toBeOnTheScreen();
    expect(
      within(card).getByTestId(
        SocialPostDecisionViewSelectorsIDs.PROFILE_PREVIEW_VERIFIED_BADGE,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialPostDecisionViewSelectorsIDs.POST_PREVIEW),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialPostDecisionViewSelectorsIDs.REASON_VALUE),
    ).toHaveTextContent('Uses another creator’s name and photo');
  });

  it.each<[SocialDecisionKind, string, 'post' | 'profile']>([
    ['report-post-removed', 'report_post_removed', 'post'],
    ['report-post-left-up', 'report_post_left_up', 'post'],
    ['report-profile-hidden', 'report_profile_hidden', 'profile'],
    ['report-profile-left-up', 'report_profile_left_up', 'profile'],
  ])('tells a reporter the %s outcome', async (kind, copyKey, subject) => {
    renderSocialPostDecisionView({
      ...POST_DECISION,
      kind,
      reason: 'Financial conduct',
      postedAt: undefined,
    });

    expect(
      await screen.findByTestId(SocialPostDecisionViewSelectorsIDs.TITLE),
    ).toHaveTextContent(
      strings(`social_leaderboard.post_decision.${copyKey}.title`),
    );
    expect(
      screen.getByTestId(SocialPostDecisionViewSelectorsIDs.REASON_VALUE),
    ).toHaveTextContent('Financial conduct');
    expect(
      screen.getByTestId(
        subject === 'post'
          ? SocialPostDecisionViewSelectorsIDs.POST_PREVIEW
          : SocialPostDecisionViewSelectorsIDs.PROFILE_PREVIEW,
      ),
    ).toBeOnTheScreen();
  });

  it.each<SocialDecisionKind>([
    'post-removed',
    'profile-hidden',
    'report-post-left-up',
    'report-profile-left-up',
  ])('lets the viewer appeal the %s outcome', async (kind) => {
    renderSocialPostDecisionView({
      ...POST_DECISION,
      kind,
      reason: 'Financial conduct',
    });

    expect(
      await screen.findByTestId(
        SocialPostDecisionViewSelectorsIDs.APPEAL_BUTTON,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialPostDecisionViewSelectorsIDs.DONE_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it.each<SocialDecisionKind>(['report-post-removed', 'report-profile-hidden'])(
    'ends the %s outcome with Done instead of an appeal',
    async (kind) => {
      renderSocialPostDecisionView({
        ...POST_DECISION,
        kind,
        reason: 'Financial conduct',
      });

      expect(
        await screen.findByTestId(
          SocialPostDecisionViewSelectorsIDs.DONE_BUTTON,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(SocialPostDecisionViewSelectorsIDs.APPEAL_BUTTON),
      ).not.toBeOnTheScreen();
    },
  );

  it('opens the appeal form for the decision with Appeal', async () => {
    renderSocialPostDecisionView(POST_DECISION, [
      {
        name: Routes.SOCIAL.POST_APPEAL,
        Component: createRouteParamsProbe(Routes.SOCIAL.POST_APPEAL),
      },
    ]);

    fireEvent.press(
      await screen.findByTestId(
        SocialPostDecisionViewSelectorsIDs.APPEAL_BUTTON,
      ),
    );

    expect(
      await screen.findByTestId(
        getRouteParamsProbeTestId(Routes.SOCIAL.POST_APPEAL),
      ),
    ).toHaveTextContent(
      JSON.stringify({
        kind: 'post-removed',
        handle: 'alphawhale',
        reason: 'Promises guaranteed returns',
      }),
    );
  });

  it('sends a reporter back to the notifications list with Done when there is nothing to go back to', async () => {
    renderSocialPostDecisionView(
      {
        ...POST_DECISION,
        kind: 'report-post-removed',
        reason: 'Financial conduct',
      },
      [{ name: Routes.NOTIFICATIONS.VIEW }],
    );

    fireEvent.press(
      await screen.findByTestId(SocialPostDecisionViewSelectorsIDs.DONE_BUTTON),
    );

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.NOTIFICATIONS.VIEW)),
    ).toBeOnTheScreen();
  });

  it('offers no back button when there is no screen to go back to', async () => {
    renderSocialPostDecisionView(POST_DECISION);

    await screen.findByTestId(SocialPostDecisionViewSelectorsIDs.CONTAINER);

    expect(
      screen.queryByTestId(SocialPostDecisionViewSelectorsIDs.BACK_BUTTON),
    ).not.toBeOnTheScreen();
  });
});
