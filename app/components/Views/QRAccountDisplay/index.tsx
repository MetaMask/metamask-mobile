/* eslint @typescript-eslint/no-var-requires: "off" */
/* eslint @typescript-eslint/no-require-imports: "off" */

'use strict';
import React, { useContext } from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useTheme } from '../../../util/theme';
import { SafeAreaView } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { IconName } from '../../../component-library/components/Icons/Icon';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import ClipboardManager from '../../../core/ClipboardManager';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { showAlert } from '../../../actions/alert';
import { selectInternalAccounts } from '../../../selectors/accountsController';
import { useSelector } from 'react-redux';
import { renderAccountName } from '../../../util/address';
import createStyles from './styles';

const copyAddressToClipboard = async (address: string) => {
  await ClipboardManager.setString(address);
  showAlert({
    isVisible: true,
    autodismiss: 1500,
    content: 'clipboard-alert',
    data: { msg: strings('account_details.account_copied_to_clipboard') },
  });
};

const PREFIX_LEN = 6;
const SUFFIX_LEN = 5;

const QRAccountDisplay = (props: { accountAddress: string }) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const addr = props.accountAddress;
  const identities = useSelector(selectInternalAccounts);
  const accountLabel = renderAccountName(addr, identities);
  const { toastRef } = useContext(ToastContext);
  const addressStart = addr.substring(0, PREFIX_LEN);
  const addressMiddle: string = addr.substring(
    PREFIX_LEN,
    addr.length - SUFFIX_LEN,
  );
  const addressEnd: string = addr.substring(addr.length - SUFFIX_LEN);

  const showCopyNotificationToast = () => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Plain,
      labelOptions: [
        {
          label: strings(`notifications.address_copied_to_clipboard`),
          isBold: false,
        },
      ],
      hasNoTimeout: false,
    });
  };

  const handleCopyButton = () => {
    showCopyNotificationToast();
    copyAddressToClipboard(props.accountAddress);
  };

  return (
    <SafeAreaView style={styles.wrapper}>
      <Text variant={TextVariant.BodyLGMedium} style={styles.accountLabel}>
        {accountLabel}
      </Text>

      <>
        <Text variant={TextVariant.BodyMD} style={styles.addressContainer}>
          {addressStart}
          <Text variant={TextVariant.BodyMD} color={TextColor.Muted}>
            {addressMiddle}
          </Text>
          {addressEnd}
        </Text>
      </>

      <>
        <Button
          variant={ButtonVariants.Link}
          startIconName={IconName.Copy}
          size={ButtonSize.Lg}
          label={strings('receive_request.copy_address')}
          onPress={handleCopyButton}
          style={styles.copyButton}
        >
          {strings('receive_request.copy_address')}
        </Button>
      </>
    </SafeAreaView>
  );
};

export default QRAccountDisplay;
