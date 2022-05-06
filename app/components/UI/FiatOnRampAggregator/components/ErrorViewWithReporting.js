import React from 'react';
import PropTypes from 'prop-types';
import ErrorView from './ErrorView';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../locales/i18n';

/**
 * ErrorViewWithReporting is a functional general-purpose UI component responsible to show error details in Fiat On-Ramp
 *
 * @param {string} description The error description (Required)
 *
 */
function ErrorViewWithReporting({ description }) {
  const navigation = useNavigation();
  return (
    <ErrorView
      description={description}
      title={strings('fiat_on_ramp_aggregator.something_went_wrong')}
      ctaLabel={strings('fiat_on_ramp_aggregator.report_this_issue')}
      ctaOnPress={() => {
        //TODO: implement a reporting mechanisim for the sdkError
        navigation.dangerouslyGetParent()?.pop();
      }}
    />
  );
}

ErrorViewWithReporting.propTypes = {
  description: PropTypes.string.isRequired,
};

export default ErrorViewWithReporting;
