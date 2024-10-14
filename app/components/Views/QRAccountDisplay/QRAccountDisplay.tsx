'use strict';
import React, { useContext } from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { SafeAreaView } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import { IconName } from '../../../component-library/components/Icons/Icon';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './QRAccountDisplay.styles';
import ClipboardManager from '../../../core/ClipboardManager';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { selectInternalAccounts } from '../../../selectors/accountsController';
import { renderAccountName } from '../../../util/address';

const ADDRESS_PREFIX_LENGTH = 6;
const ADDRESS_SUFFIX_LENGTH = 5;

const QRAccountDisplay = (props: { accountAddress: string }) => {
  const { styles } = useStyles(styleSheet, {});
  const addr = props.accountAddress;
  const identities = useSelector(selectInternalAccounts);
  const accountLabel = renderAccountName(addr, identities);
  const { toastRef } = useContext(ToastContext);
  const addressStart = addr.substring(0, ADDRESS_PREFIX_LENGTH);
  const addressMiddle: string = addr.substring(
    ADDRESS_PREFIX_LENGTH,
    addr.length - ADDRESS_SUFFIX_LENGTH,
  );
  const addressEnd: string = addr.substring(
    addr.length - ADDRESS_SUFFIX_LENGTH,
  );

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

  const handleCopyButton = async () => {
    showCopyNotificationToast();
    await ClipboardManager.setString(props.accountAddress);
  };

  return (
    <SafeAreaView style={styles.wrapper}>
      <Text variant={TextVariant.BodyLGMedium} style={styles.accountLabel}>
        {accountLabel}
      </Text>
      <Text variant={TextVariant.BodyMD} style={styles.addressContainer}>
        {addressStart}
        <Text variant={TextVariant.BodyMD} color={TextColor.Muted}>
          {addressMiddle}
        </Text>
        {addressEnd}
      </Text>
      <Button
        variant={ButtonVariants.Link}
        startIconName={IconName.Copy}
        size={ButtonSize.Lg}
        testID="qr-account-display-copy-button"
        label={strings('receive_request.copy_address')}
        onPress={handleCopyButton}
        style={styles.copyButton}
      >
        {strings('receive_request.copy_address')}
      </Button>
    </SafeAreaView>
  );
};

export default QRAccountDisplay;
