import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { TrustSignalDisplayState } from '../../Views/confirmations/types/trustSignals';

const styles = StyleSheet.create({
  urlIcon: {
    marginTop: 1,
    alignSelf: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Geist-SemiBold',
    textAlign: 'center',
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
    color={IconColor.ErrorDefault}
    style={styles.urlIcon}
  />
);

/**
 * Icon displayed next to the dapp hostname based on the trust signal state.
 */
export const TrustSignalUrlIcon = ({
  state,
}: {
  state: TrustSignalDisplayState;
}) => {
  switch (state) {
    case TrustSignalDisplayState.Verified:
      return (
        <Icon
          name={IconName.VerifiedFilled}
          size={IconSize.Sm}
          color={IconColor.SuccessDefault}
          style={styles.urlIcon}
        />
      );
    case TrustSignalDisplayState.Malicious:
      return (
        <Icon
          name={IconName.Danger}
          size={IconSize.Sm}
          color={IconColor.ErrorDefault}
          style={styles.urlIcon}
        />
      );
    default:
      return null;
  }
};

/**
 * Content for the red "Connect" button on Step 1 of the malicious-dapp
 * warning flow.  Renders a danger triangle to the left of the "Connect" label.
 */
export const DangerConnectButtonContent = () => (
  <View style={styles.buttonContent}>
    <Icon
      name={IconName.Danger}
      size={IconSize.Sm}
      color={IconColor.PrimaryInverse}
    />
    <Text color={TextColor.PrimaryInverse} style={styles.buttonText}>
      {strings('accounts.connect')}
    </Text>
  </View>
);

/**
 * Returns the appropriate label for the confirm/connect button based on
 * whether the dApp is malicious and whether this is a network switch.
 */
export const getConnectButtonContent = (
  isMaliciousDapp: boolean,
  isNetworkSwitch: boolean,
  trustSignalState?: TrustSignalDisplayState,
): React.ReactNode => {
  if (isNetworkSwitch) {
    return strings('confirmation_modal.confirm_cta');
  }
  if (
    isMaliciousDapp ||
    trustSignalState === TrustSignalDisplayState.Malicious
  ) {
    return <DangerConnectButtonContent />;
  }

  return strings('accounts.connect');
};
