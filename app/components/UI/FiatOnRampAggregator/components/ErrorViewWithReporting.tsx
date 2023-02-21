import React from 'react';
import ErrorView from './ErrorView';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../locales/i18n';
import { ScreenLocation } from '../types';
/**
 * ErrorViewWithReporting is a functional general-purpose UI component responsible to show error details in Fiat On-Ramp
 *
 * @param {string} description The error description (Required)
 *
 */
function ErrorViewWithReporting({
  error,
  location,
}: {
  error: Error;
  location: ScreenLocation;
}) {
  const navigation = useNavigation();

  return (
    <ErrorView
      description={
        error?.message ||
        strings('fiat_on_ramp_aggregator.something_went_wrong')
      }
      title={strings('fiat_on_ramp_aggregator.something_went_wrong')}
      ctaLabel={strings('fiat_on_ramp_aggregator.return_home')}
      ctaOnPress={() => {
        //TODO: implement a mechanisim for user to submit a support ticket
        // @ts-expect-error navigation prop mismatch
        navigation.dangerouslyGetParent()?.pop();
      }}
      location={location}
    />
  );
}

export default ErrorViewWithReporting;
