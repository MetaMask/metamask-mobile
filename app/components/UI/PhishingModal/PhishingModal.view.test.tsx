/**
 * Component View tests for the phishing warning modal UI.
 *
 * Mirrors: tests/smoke/wallet/browser/browser-phishing.spec.ts
 *
 * CV covers modal UI and user actions (back to safety, proceed anyway).
 * Full E2E flows require WebView navigation, dapp-scanning API interception,
 * and iframe redirect detection — see it.skip placeholders.
 *
 * Run: yarn jest -c jest.config.view.js PhishingModal.view.test.tsx --runInBand
 */
import '../../../../tests/component-view/mocks';
import React, { useState } from 'react';
import { View } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { renderComponentViewScreen } from '../../../../tests/component-view/render';
import { createStateFixture } from '../../../../tests/component-view/stateFixture';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import PhishingModal from './index';
import { PhishingModalSelectorsIDs } from './PhishingModal.testIds';

const BLOCKED_URL = 'https://phishing-test.example.com';

function PhishingModalHarness({
  initialUrl = BLOCKED_URL,
}: {
  initialUrl?: string;
}) {
  const [wentBack, setWentBack] = useState(false);

  if (wentBack) {
    return <View testID="phishing-modal-harness-safe-screen" />;
  }

  return (
    <PhishingModal
      fullUrl={initialUrl}
      goBackToSafety={() => {
        setWentBack(true);
      }}
      continueToPhishingSite={jest.fn()}
      goToFilePhishingIssue={jest.fn()}
    />
  );
}

function renderPhishingModalHarness() {
  const state = createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withRemoteFeatureFlags({})
    .build();

  return renderComponentViewScreen(
    PhishingModalHarness as unknown as React.ComponentType,
    { name: Routes.BROWSER.HOME },
    { state },
  );
}

describeForPlatforms('PhishingModal component views', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // E2E-only: WebView navigation to blocked URL / blocked iframe (browser-phishing.spec.ts).
  // CV covers the modal UI once phishing detection has fired.

  it('renders the phishing detection title and back to safety button for a blocked URL', async () => {
    const { findByTestId, findByText } = renderPhishingModalHarness();

    expect(
      await findByTestId(PhishingModalSelectorsIDs.DETECTION_TITLE),
    ).toBeOnTheScreen();

    expect(
      await findByText(strings('phishing.site_might_be_harmful')),
    ).toBeOnTheScreen();

    expect(
      await findByTestId(PhishingModalSelectorsIDs.BACK_TO_SAFETY_BUTTON),
    ).toBeOnTheScreen();
  });

  it('invokes goBackToSafety when the user taps Back to safety', async () => {
    const { findByTestId, findByTestId: findProbe } =
      renderPhishingModalHarness();

    fireEvent.press(
      await findByTestId(PhishingModalSelectorsIDs.BACK_TO_SAFETY_BUTTON),
    );

    expect(
      await findProbe('phishing-modal-harness-safe-screen'),
    ).toBeOnTheScreen();
  });

  it('invokes continueToPhishingSite when the user taps Proceed anyway', async () => {
    const continueSpy = jest.fn();

    function ProceedHarness() {
      return (
        <PhishingModal
          fullUrl={BLOCKED_URL}
          goBackToSafety={jest.fn()}
          continueToPhishingSite={continueSpy}
          goToFilePhishingIssue={jest.fn()}
        />
      );
    }

    const state = createStateFixture()
      .withMinimalAccounts()
      .withMinimalMainnetNetwork()
      .build();

    const { findByText } = renderComponentViewScreen(
      ProceedHarness as unknown as React.ComponentType,
      { name: Routes.BROWSER.HOME },
      { state },
    );

    fireEvent.press(await findByText(strings('phishing.proceed_anyway')));

    expect(continueSpy).toHaveBeenCalledTimes(1);
  });
});
