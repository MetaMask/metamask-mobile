/**
 * Component-view coverage for the moderation appeal form: the empty and
 * filled form, the email error, handing the appeal to support through the
 * consent sheet, and the confirmation.
 *
 * Run with:
 * yarn jest -c jest.config.view.js app/components/Views/SocialLeaderboard/SocialPostAppealView/SocialPostAppealView.view.test.tsx --runInBand --silent --coverage=false
 */

import '../../../../../tests/component-view/mocks';
import React from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { strings } from '../../../../../locales/i18n';
import {
  getRouteParamsProbeTestId,
  getRouteProbeTestId,
} from '../../../../../tests/component-view/render';
import { renderSocialPostAppealView } from '../../../../../tests/component-view/renderers/socialLeaderboard';
import Routes from '../../../../constants/navigation/Routes';
import { SocialPostAppealViewSelectorsIDs } from './SocialPostAppealView.testIds';
import type { SocialPostAppealViewParams } from './SocialPostAppealView.types';

const APPEAL_PARAMS: SocialPostAppealViewParams = {
  kind: 'post-removed',
  handle: 'alphawhale',
  reason: 'Promises guaranteed returns',
};

const CONSENT_CONFIRM_TEST_ID = 'consent-confirm';
const WEBVIEW_BACK_TEST_ID = 'webview-back';

/** Stands in for the support consent sheet: confirming closes it and shares the details. */
const ConsentSheetProbe = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const sheet = route.params as
    | { params?: { onConfirm?: () => void } }
    | undefined;

  return (
    <Pressable
      accessibilityRole="button"
      testID={CONSENT_CONFIRM_TEST_ID}
      onPress={() => {
        // Like the real sheet, close first and then run the confirmation.
        navigation.goBack();
        sheet?.params?.onConfirm?.();
      }}
    />
  );
};

/** Stands in for the in-app browser, with a way back to the form. */
const WebviewProbe = () => {
  const navigation = useNavigation();
  const route = useRoute();

  return (
    <>
      <Text testID={getRouteParamsProbeTestId(Routes.WEBVIEW.MAIN)}>
        {JSON.stringify(route.params ?? {})}
      </Text>
      <Pressable
        accessibilityRole="button"
        testID={WEBVIEW_BACK_TEST_ID}
        onPress={() => navigation.goBack()}
      />
    </>
  );
};

const SUPPORT_ROUTES = [
  { name: Routes.MODAL.ROOT_MODAL_FLOW, Component: ConsentSheetProbe },
  { name: Routes.WEBVIEW.MAIN, Component: WebviewProbe },
  { name: Routes.NOTIFICATIONS.VIEW },
];

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
  it('starts empty, with the email hint and Submit appeal disabled', async () => {
    renderSocialPostAppealView(APPEAL_PARAMS, SUPPORT_ROUTES);

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
    renderSocialPostAppealView(APPEAL_PARAMS, SUPPORT_ROUTES);

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

  it('shows the email error instead of sending when the email is invalid, and clears it on edit', async () => {
    renderSocialPostAppealView(APPEAL_PARAMS, SUPPORT_ROUTES);
    await fillForm('alex@example', 'I think this is wrong.');

    fireEvent.press(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON),
    );

    expect(
      await screen.findByTestId(SocialPostAppealViewSelectorsIDs.EMAIL_ERROR),
    ).toHaveTextContent(strings('social_leaderboard.post_appeal.email_error'));
    expect(
      screen.queryByTestId(getRouteProbeTestId(Routes.MODAL.ROOT_MODAL_FLOW)),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialPostAppealViewSelectorsIDs.EMAIL_HELPER),
    ).not.toBeOnTheScreen();

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

  it('hands the appeal to support once the viewer confirms, then confirms receipt', async () => {
    renderSocialPostAppealView(APPEAL_PARAMS, SUPPORT_ROUTES);
    await fillForm('alex@example.com', 'This breaks nothing & I appeal.');

    fireEvent.press(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON),
    );
    fireEvent.press(await screen.findByTestId(CONSENT_CONFIRM_TEST_ID));

    const webview = await screen.findByTestId(
      getRouteParamsProbeTestId(Routes.WEBVIEW.MAIN),
    );
    const { params } = JSON.parse(webview.props.children as string) as {
      screen: string;
      params: { url: string; title: string };
    };
    const url = new URL(params.url);
    expect(url.hostname).toBe('support.metamask.io');
    expect(url.searchParams.get('appeal_decision')).toBe('post-removed');
    expect(url.searchParams.get('appeal_handle')).toBe('alphawhale');
    expect(url.searchParams.get('appeal_reason')).toBe(
      'Promises guaranteed returns',
    );
    expect(url.searchParams.get('appeal_email')).toBe('alex@example.com');
    expect(url.searchParams.get('appeal_message')).toBe(
      'This breaks nothing & I appeal.',
    );

    fireEvent.press(screen.getByTestId(WEBVIEW_BACK_TEST_ID));

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
    renderSocialPostAppealView(APPEAL_PARAMS, SUPPORT_ROUTES);
    await fillForm('alex@example.com', 'I appeal.');
    fireEvent.press(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON),
    );
    fireEvent.press(await screen.findByTestId(CONSENT_CONFIRM_TEST_ID));
    await screen.findByTestId(getRouteParamsProbeTestId(Routes.WEBVIEW.MAIN));
    fireEvent.press(screen.getByTestId(WEBVIEW_BACK_TEST_ID));

    fireEvent.press(
      await screen.findByTestId(SocialPostAppealViewSelectorsIDs.DONE_BUTTON),
    );

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.NOTIFICATIONS.VIEW)),
    ).toBeOnTheScreen();
  });
});
