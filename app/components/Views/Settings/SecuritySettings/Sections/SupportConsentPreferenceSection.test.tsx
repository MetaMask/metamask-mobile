import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { SUPPORT_CONSENT_PREFERENCE_TOGGLE } from '../SecuritySettings.constants';
import SupportConsentPreferenceSection from './SupportConsentPreferenceSection';

const renderWith = (
  shouldShowConsentSheet: boolean,
  dataSharingPreference: boolean | null,
) =>
  renderWithProvider(<SupportConsentPreferenceSection />, {
    state: { security: { shouldShowConsentSheet, dataSharingPreference } },
  });

describe('SupportConsentPreferenceSection', () => {
  it('renders the toggle off with the base description when no preference is saved', () => {
    const { getByText, getByTestId } = renderWith(true, null);

    expect(
      getByText(strings('support_consent_preference.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('support_consent_preference.description')),
    ).toBeOnTheScreen();
    expect(getByTestId(SUPPORT_CONSENT_PREFERENCE_TOGGLE)).toHaveProp(
      'value',
      false,
    );
  });

  it('renders the toggle on and describes the saved share decision', () => {
    const { getByText, getByTestId } = renderWith(false, true);

    expect(
      getByText(
        `${strings('support_consent_preference.description')} ${strings(
          'support_consent_preference.currently_sharing',
        )}`,
      ),
    ).toBeOnTheScreen();
    expect(getByTestId(SUPPORT_CONSENT_PREFERENCE_TOGGLE)).toHaveProp(
      'value',
      true,
    );
  });

  it('describes the saved do-not-share decision', () => {
    const { getByText } = renderWith(false, false);

    expect(
      getByText(
        `${strings('support_consent_preference.description')} ${strings(
          'support_consent_preference.currently_not_sharing',
        )}`,
      ),
    ).toBeOnTheScreen();
  });

  it('asks for consent again when the toggle is turned off', () => {
    const { getByTestId, store } = renderWith(false, true);

    fireEvent(
      getByTestId(SUPPORT_CONSENT_PREFERENCE_TOGGLE),
      'valueChange',
      false,
    );

    expect(store.getState().security.shouldShowConsentSheet).toBe(true);
    expect(store.getState().security.dataSharingPreference).toBe(true);
  });

  it('stops asking for consent when the toggle is turned on', () => {
    const { getByTestId, store } = renderWith(true, false);

    fireEvent(
      getByTestId(SUPPORT_CONSENT_PREFERENCE_TOGGLE),
      'valueChange',
      true,
    );

    expect(store.getState().security.shouldShowConsentSheet).toBe(false);
  });
});
