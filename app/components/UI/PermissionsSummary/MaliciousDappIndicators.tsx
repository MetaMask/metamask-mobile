import React from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import { TrustSignalDisplayState } from '../../Views/confirmations/types/trustSignals';

const styles = StyleSheet.create({
  urlIcon: {
    marginTop: 2,
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
    fontFamily: 'Geist-Bold',
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
    color={IconColor.Error}
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
          color={IconColor.Success}
          style={styles.urlIcon}
        />
      );
    case TrustSignalDisplayState.Warning:
      return (
        <Icon
          name={IconName.Warning}
          size={IconSize.Sm}
          color={IconColor.Warning}
          style={styles.urlIcon}
        />
      );
    case TrustSignalDisplayState.Malicious:
      return (
        <Icon
          name={IconName.Danger}
          size={IconSize.Sm}
          color={IconColor.Error}
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
export const DangerConnectButtonContent = () => {
  const { colors } = useTheme();

  return (
    <View style={styles.buttonContent}>
      <Icon
        name={IconName.Danger}
        size={IconSize.Sm}
        color={IconColor.Inverse}
      />
      <RNText style={[styles.buttonText, { color: colors.primary.inverse }]}>
        {strings('accounts.connect')}
      </RNText>
    </View>
  );
};

/**
 * Content for the warning "Connect" button when a dapp has a warning-level
 * trust signal. Renders a danger triangle to the left of the "Connect" label.
 */
export const WarningConnectButtonContent = () => {
  const { colors } = useTheme();

  return (
    <View style={styles.buttonContent}>
      <Icon
        name={IconName.Danger}
        size={IconSize.Sm}
        color={IconColor.Inverse}
      />
      <RNText style={[styles.buttonText, { color: colors.primary.inverse }]}>
        {strings('accounts.connect')}
      </RNText>
    </View>
  );
};

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
  if (isMaliciousDapp) {
    return <DangerConnectButtonContent />;
  }
  if (trustSignalState === TrustSignalDisplayState.Malicious) {
    return <DangerConnectButtonContent />;
  }
  if (trustSignalState === TrustSignalDisplayState.Warning) {
    return <WarningConnectButtonContent />;
  }
  return strings('accounts.connect');
};
