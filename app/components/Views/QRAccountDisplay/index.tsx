/* eslint @typescript-eslint/no-var-requires: "off" */
/* eslint @typescript-eslint/no-require-imports: "off" */

'use strict';
import React from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useTheme } from '../../../util/theme';
import { SafeAreaView, StyleSheet } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { Theme } from '../../../util/theme/models';
import { IconName } from '../../../component-library/components/Icons/Icon';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import ClipboardManager from '../../../core/ClipboardManager';
import { showAlert } from '../../../actions/alert';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: theme.colors.background.default,
      marginVertical: 32, // TODO: remove this when the component is no longer used in a modal
    },
    accountLabel: {
      alignSelf: 'center',
      marginBottom: 16,
    },
    addressContainer: {
      width: 185,
      textAlign: 'center',
    },
    copyButton: {
      alignSelf: 'center',
    },
  });

const copyAddressToClipboard = async (address: string) => {
  ClipboardManager.setString(address);
  showAlert({
    isVisible: true,
    autodismiss: 1500,
    content: 'clipboard-alert',
    data: { msg: strings('account_details.account_copied_to_clipboard') },
  });
  // TODO: handle warnings about seed phrase not backed up?
};

const PREFIX_LEN = 6;
const SUFFIX_LEN = 5;

const QRAccountDisplay = (props: {
  accountAddress: string;
  accountLabel: string;
}) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const addr = props.accountAddress;
  const addressStart = addr.substring(0, PREFIX_LEN);
  const addressMiddle: string = addr.substring(
    PREFIX_LEN,
    addr.length - SUFFIX_LEN,
  );
  const addressEnd: string = addr.substring(addr.length - SUFFIX_LEN);

  return (
    <SafeAreaView style={styles.wrapper}>
      {/*account name*/}
      <Text variant={TextVariant.BodyLGMedium} style={styles.accountLabel}>
        {props.accountLabel}
      </Text>

      {/*address*/}
      <>
        <Text variant={TextVariant.BodyMD} style={styles.addressContainer}>
          {addressStart}
          <Text variant={TextVariant.BodyMD} color={TextColor.Muted}>
            {addressMiddle}
          </Text>
          {addressEnd}
        </Text>
      </>

      {/*copy button*/}
      <>
        <Button
          variant={ButtonVariants.Link}
          startIconName={IconName.Copy}
          size={ButtonSize.Lg}
          label={strings('receive_request.copy_address')}
          onPress={() => copyAddressToClipboard(props.accountAddress)}
          style={styles.copyButton}
        >
          {strings('receive_request.copy_address')}
        </Button>
      </>
    </SafeAreaView>
  );
};

export default QRAccountDisplay;
