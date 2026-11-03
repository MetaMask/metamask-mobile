import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { SUPPORT_CONSENT_PREFERENCE_TOGGLE } from '../SecuritySettings.constants';
import SupportConsentPreferenceSection from './SupportConsentPreferenceSection';

const renderWith = (shouldShowConsentSheet: boolean) =>
  renderWithProvider(<SupportConsentPreferenceSection />, {
    state: { security: { shouldShowConsentSheet } },
  });

describe('SupportConsentPreferenceSection', () => {
  it('renders the toggle off with its description', () => {
    const { getByText, getByTestId } = renderWith(true);

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

  it('asks for consent again when the toggle is turned off', () => {
    const { getByTestId, store } = renderWith(false);

    fireEvent(
      getByTestId(SUPPORT_CONSENT_PREFERENCE_TOGGLE),
      'valueChange',
      false,
    );

    expect(store.getState().security.shouldShowConsentSheet).toBe(true);
  });

  it('stops asking for consent when the toggle is turned on', () => {
    const { getByTestId, store } = renderWith(true);

    fireEvent(
      getByTestId(SUPPORT_CONSENT_PREFERENCE_TOGGLE),
      'valueChange',
      true,
    );

    expect(store.getState().security.shouldShowConsentSheet).toBe(false);
  });
});
