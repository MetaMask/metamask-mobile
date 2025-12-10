import React from 'react';
import PropTypes from 'prop-types';
import Text from './Text';
import { StyleSheet } from 'react-native';
import { FIAT_ORDER_STATES } from '../../constants/on-ramp';
import { strings } from '../../../locales/i18n';
import { useTheme } from '../../util/theme';
import { TransactionStatus } from '@metamask/transaction-controller';

const styles = StyleSheet.create({
  status: {
    marginTop: 4,
    fontSize: 12,
    letterSpacing: 0.5,
  },
});

export const ConfirmedText = ({ testID, style: styleProp, ...props }) => (
  <Text
    testID={testID}
    bold
    green
    style={[styles.status, styleProp]}
    {...props}
  />
);
ConfirmedText.propTypes = {
  testID: PropTypes.string,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export const PendingText = ({ testID, style: styleProp, ...props }) => {
  const { colors } = useTheme();
  return (
    <Text
      testID={testID}
      bold
      style={[styles.status, { color: colors.warning.default }, styleProp]}
      {...props}
    />
  );
};
PendingText.propTypes = {
  testID: PropTypes.string,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export const FailedText = ({ testID, style: styleProp, ...props }) => {
  const { colors } = useTheme();
  return (
    <Text
      testID={testID}
      bold
      style={[styles.status, { color: colors.error.default }, styleProp]}
      {...props}
    />
  );
};
FailedText.propTypes = {
  testID: PropTypes.string,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

function StatusText({ status, context, testID, ...props }) {
  switch (status) {
    case 'Confirmed':
    case 'confirmed':
      return (
        <ConfirmedText testID={testID} {...props}>
          {strings(`${context}.${status}`)}
        </ConfirmedText>
      );
    case 'Pending':
    case 'pending':
    case 'Submitted':
    case 'submitted':
    case 'Unconfirmed':
    case 'unconfirmed':
    case TransactionStatus.signed:
      return (
        <PendingText testID={testID} {...props}>
          {strings(`${context}.${status}`)}
        </PendingText>
      );
    case 'Failed':
    case 'Cancelled':
    case 'failed':
    case 'cancelled':
      return (
        <FailedText testID={testID} {...props}>
          {strings(`${context}.${status}`)}
        </FailedText>
      );

    case FIAT_ORDER_STATES.COMPLETED:
      return (
        <ConfirmedText {...props}>
          {strings(`${context}.completed`)}
        </ConfirmedText>
      );
    case FIAT_ORDER_STATES.PENDING:
      return (
        <PendingText {...props}>{strings(`${context}.pending`)}</PendingText>
      );
    case FIAT_ORDER_STATES.FAILED:
      return <FailedText {...props}>{strings(`${context}.failed`)}</FailedText>;
    case FIAT_ORDER_STATES.CANCELLED:
      return (
        <FailedText {...props}>{strings(`${context}.cancelled`)}</FailedText>
      );

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
  testID: PropTypes.string,
};

export default StatusText;
