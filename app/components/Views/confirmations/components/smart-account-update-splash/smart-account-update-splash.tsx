import React, { useCallback, useState } from 'react';
import { JsonRpcError, serializeError } from '@metamask/rpc-errors';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Engine from '../../../../../core/Engine';
import { EIP5792ErrorCode } from '../../../../../constants/transaction';
import { isHardwareAccount } from '../../../../../util/address';
import { selectSmartAccountOptIn } from '../../../../../selectors/preferencesController';
import { useStyles } from '../../../../hooks/useStyles';
import { useConfirmActions } from '../../hooks/useConfirmActions';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { SmartAccountUpdateContent } from '../smart-account-update-content';
import styleSheet from './smart-account-update-splash.styles';

export const SmartAccountUpdateSplash = () => {
  const { PreferencesController } = Engine.context;
  const [acknowledged, setAcknowledged] = useState(false);
  const transactionMetadata = useTransactionMetadataRequest();
  const smartAccountOptIn = useSelector(selectSmartAccountOptIn);
  const {
    txParams: { from },
  } = transactionMetadata ?? { txParams: {} };
  const { styles } = useStyles(styleSheet, {});
  const { onReject } = useConfirmActions();

  const onUpgradeReject = useCallback(() => {
    const serializedError = serializeError(
      new JsonRpcError(
        EIP5792ErrorCode.RejectedUpgrade,
        'User rejected account upgrade',
      ),
    );

    onReject(serializedError as unknown as Error);
  }, [onReject]);

  const onConfirm = useCallback(() => {
    PreferencesController.setSmartAccountOptIn(true);
    setAcknowledged(true);
  }, [setAcknowledged]); // eslint-disable-line react-hooks/exhaustive-deps

  if (
    !transactionMetadata ||
    acknowledged ||
    (smartAccountOptIn && from && !isHardwareAccount(from))
  ) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <SmartAccountUpdateContent />
      <View style={styles.buttonSection}>
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Lg}
          style={styles.buttons}
          label={strings('confirm.7702_functionality.splashpage.reject')}
          onPress={onUpgradeReject}
        />
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          style={styles.buttons}
          label={strings('confirm.7702_functionality.splashpage.accept')}
          onPress={onConfirm}
        />
      </View>
    </View>
  );
};
