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
import { RowAlertKey } from '../../../UI/info-row/alert-row/constants';
import InfoSection from '../../../UI/info-row/info-section';
import AlertRow from '../../../UI/info-row/alert-row';
import { Skeleton } from '../../../../../../../component-library/components/Skeleton';
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
            size={IconSize.Sm}
            name={IconName.ArrowRight}
            color={IconColor.Alternative}
          />
        </View>

        <View style={[styles.nameContainer, styles.rightNameContainer]}>
          {/* Intentional empty label to trigger the alert row without a label */}
          <AlertRow alertField={RowAlertKey.BurnAddress}>
            <Name
              type={NameType.EthereumAddress}
              value={toAddress as string}
              variation={chainId}
              maxCharLength={MAX_CHAR_LENGTH}
            />
          </AlertRow>
        </View>
      </View>
    </InfoSection>
  );
};

export function FromToRowSkeleton() {
  const { styles } = useStyles(styleSheet, {});

  return (
    <InfoSection>
      <View style={styles.container}>
        <View style={[styles.nameContainer, styles.leftNameContainer]}>
          <Skeleton
            width={110}
            height={36}
            style={styles.skeletonBorderRadiusLarge}
          />
        </View>
        <View style={styles.iconContainer}>
          <Skeleton
            width={16}
            height={16}
            style={styles.skeletonBorderRadiusSmall}
          />
        </View>
        <View style={[styles.nameContainer, styles.rightNameContainer]}>
          <Skeleton
            width={110}
            height={36}
            style={styles.skeletonBorderRadiusLarge}
          />
        </View>
      </View>
    </InfoSection>
  );
}

export default FromToRow;
