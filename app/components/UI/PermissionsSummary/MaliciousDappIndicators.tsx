import React from 'react';
import { StyleSheet } from 'react-native';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';

const styles = StyleSheet.create({
  urlIcon: {
    marginTop: 2,
    alignSelf: 'center',
  },
});

/**
 * Danger icon displayed next to the dapp hostname when it is flagged
 * as malicious by the WalletConnect Verify API.
 */
export const MaliciousDappUrlIcon = () => (
  <Icon
    name={IconName.Danger}
    size={IconSize.Sm}
    color={IconColor.Error}
    style={styles.urlIcon}
  />
);

/**
 * Returns the appropriate label for the confirm/connect button based on
 * whether this is a network switch.
 */
export const getConnectButtonContent = (
  _isMaliciousDapp: boolean,
  isNetworkSwitch: boolean,
): string => {
  if (isNetworkSwitch) {
    return strings('confirmation_modal.confirm_cta');
  }
  return strings('accounts.connect');
};
