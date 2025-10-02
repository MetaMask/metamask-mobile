import React from 'react';
import { View } from 'react-native';

import { ConfirmationRowComponentIDs } from '../../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import { useStyles } from '../../../../../../../component-library/hooks';
import Name from '../../../../../../UI/Name/Name';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../../../component-library/components/Icons/Icon';
import { NameType } from '../../../../../../UI/Name/Name.types';
import { useTransferRecipient } from '../../../../hooks/transactions/useTransferRecipient';
import InfoSection from '../../../UI/info-row/info-section';
import styleSheet from './from-to-row.styles';

const FromToRow = () => {
  const { styles } = useStyles(styleSheet, {});
  const transactionMetadata = useTransactionMetadataRequest();
  const transferRecipient = useTransferRecipient();

  // Do not set than 13 characters, it breaks the UI for small screens
  const MAX_CHAR_LENGTH = 13;

  if (!transactionMetadata) {
    return null;
  }

  const { chainId, txParams } = transactionMetadata;
  const { from } = txParams;

  const fromAddress = from as string;
  const toAddress = transferRecipient;

  return (
    <InfoSection testID={ConfirmationRowComponentIDs.FROM_TO}>
      <View style={styles.container}>
        <View style={[styles.nameContainer, styles.leftNameContainer]}>
          <Name
            type={NameType.EthereumAddress}
            value={fromAddress}
            variation={chainId}
            maxCharLength={MAX_CHAR_LENGTH}
          />
        </View>

        <View style={styles.iconContainer}>
          <Icon
            size={IconSize.Xs}
            name={IconName.ArrowRight}
            color={IconColor.Alternative}
          />
        </View>

        <View style={[styles.nameContainer, styles.rightNameContainer]}>
          <Name
            type={NameType.EthereumAddress}
            value={toAddress}
            variation={chainId}
            maxCharLength={MAX_CHAR_LENGTH}
          />
        </View>
      </View>
    </InfoSection>
  );
};

export default FromToRow;
