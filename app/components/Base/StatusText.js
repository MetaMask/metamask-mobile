import React from 'react';
import PropTypes from 'prop-types';
import Text from './Text';
import { StyleSheet } from 'react-native';
import { FIAT_ORDER_STATES } from '../../constants/on-ramp';
import { strings } from '../../../locales/i18n';
import { useTheme } from '../../util/theme';

const styles = StyleSheet.create({
  status: {
    marginTop: 4,
    fontSize: 12,
    letterSpacing: 0.5,
  },
});

export const ConfirmedText = (props) => (
  <Text bold green style={styles.status} {...props} />
);
export const PendingText = (props) => {
  const { colors } = useTheme();
  return (
    <Text
      bold
      style={[styles.status, { color: colors.secondary.default }]}
      {...props}
    />
  );
};
export const FailedText = (props) => {
  const { colors } = useTheme();
  return (
    <Text
      bold
      style={[styles.status, { color: colors.error.default }]}
      {...props}
    />
  );
};

function StatusText({ status, context, ...props }) {
  switch (status) {
    case 'Confirmed':
    case 'confirmed':
      return <ConfirmedText>{strings(`${context}.${status}`)}</ConfirmedText>;
    case 'Pending':
    case 'pending':
    case 'Submitted':
    case 'submitted':
      return <PendingText>{strings(`${context}.${status}`)}</PendingText>;
    case 'Failed':
    case 'Cancelled':
    case 'failed':
    case 'cancelled':
      return <FailedText>{strings(`${context}.${status}`)}</FailedText>;

    case FIAT_ORDER_STATES.COMPLETED:
      return <ConfirmedText>{strings(`${context}.completed`)}</ConfirmedText>;
    case FIAT_ORDER_STATES.PENDING:
      return <PendingText>{strings(`${context}.pending`)}</PendingText>;
    case FIAT_ORDER_STATES.FAILED:
      return <FailedText>{strings(`${context}.failed`)}</FailedText>;
    case FIAT_ORDER_STATES.CANCELLED:
      return <FailedText>{strings(`${context}.cancelled`)}</FailedText>;

    default:
      return (
        <Text bold style={styles.status}>
          {status}
        </Text>
      );
  }
}

StatusText.defaultProps = {
  context: 'transaction',
};

StatusText.propTypes = {
  status: PropTypes.string.isRequired,
  context: PropTypes.string,
};

export default StatusText;
