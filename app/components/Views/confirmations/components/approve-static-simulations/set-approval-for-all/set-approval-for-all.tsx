import React from 'react';
import { View } from 'react-native';
import { TransactionMeta } from '@metamask/transaction-controller';

import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import { ApproveComponentIDs } from '../../../ConfirmationView.testIds';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useApproveTransactionData } from '../../../hooks/useApproveTransactionData';
import { TokenStandard } from '../../../types/token';
import InfoRow from '../../UI/info-row/info-row';
import Address from '../../UI/info-row/info-value/address';
import { Pill } from '../../UI/pill';
import styleSheet from '../shared-styles';

interface NFTInfoRowProps {
  transactionMetadata: TransactionMeta;
}

const NFTInfoRow: React.FC<NFTInfoRowProps> = ({ transactionMetadata }) => {
  const { styles } = useStyles(styleSheet, {});
  return (
    <InfoRow label={strings('confirm.nfts')}>
      <View style={styles.amountAndAddressContainer}>
        <Pill
          testID={ApproveComponentIDs.SPENDING_CAP_VALUE}
          text={strings('confirm.all')}
        />
        <Address
          address={transactionMetadata?.txParams?.to as string}
          chainId={transactionMetadata.chainId}
        />
      </View>
    </InfoRow>
  );
};

interface PermissionFromInfoRowProps {
  spender?: string;
  transactionMetadata: TransactionMeta;
}

const PermissionFromInfoRow: React.FC<PermissionFromInfoRowProps> = ({
  spender,
  transactionMetadata,
}) => (
  <InfoRow label={strings('confirm.permission_from')}>
    <Address address={spender ?? ''} chainId={transactionMetadata.chainId} />
  </InfoRow>
);
interface SpenderInfoRowProps {
  spender?: string;
  transactionMetadata: TransactionMeta;
}

const SpenderInfoRow: React.FC<SpenderInfoRowProps> = ({
  spender,
  transactionMetadata,
}) => (
  <InfoRow label={strings('confirm.spender')}>
    <Address address={spender ?? ''} chainId={transactionMetadata.chainId} />
  </InfoRow>
);

export const SetApprovalForAll = () => {
  const { tokenStandard, isRevoke, spender } = useApproveTransactionData();
  const transactionMetadata =
    useTransactionMetadataRequest() as TransactionMeta;
  const isERC721 = tokenStandard === TokenStandard.ERC721;
  const isERC1155 = tokenStandard === TokenStandard.ERC1155;
  const shouldShow = isERC721 || isERC1155;

  if (!shouldShow) {
    return null;
  }

  if (isRevoke) {
    return (
      <>
        <NFTInfoRow transactionMetadata={transactionMetadata} />
        <PermissionFromInfoRow
          spender={spender}
          transactionMetadata={transactionMetadata}
        />
      </>
    );
  }

  return (
    <>
      <NFTInfoRow transactionMetadata={transactionMetadata} />
      <SpenderInfoRow
        spender={spender}
        transactionMetadata={transactionMetadata}
      />
    </>
  );
};
