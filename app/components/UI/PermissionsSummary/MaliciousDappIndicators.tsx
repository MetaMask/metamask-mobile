import React from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';

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
