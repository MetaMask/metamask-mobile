import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

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
import { selectWalletsMap } from '../../../../../../../selectors/multichainAccounts/accountTreeController';
import { AvatarSize } from '../../../../../../../component-library/components/Avatars/Avatar';

const FromToRow = () => {
  const { styles } = useStyles(styleSheet, {});
  const transactionMetadata = useTransactionMetadataRequest();
  const transferRecipient = useTransferRecipient();
  const walletsMap = useSelector(selectWalletsMap) || {};
  const haveMoreThanOneWallet = Object.keys(walletsMap).length > 1;

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
            iconSizeOverride={
              haveMoreThanOneWallet ? AvatarSize.Md : AvatarSize.Sm
            }
          />
        </View>
      </View>
    </InfoSection>
  );
};

export default FromToRow;
