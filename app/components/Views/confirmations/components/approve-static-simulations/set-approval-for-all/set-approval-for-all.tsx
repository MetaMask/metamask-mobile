import React from 'react';
import { View } from 'react-native';
import { TransactionMeta } from '@metamask/transaction-controller';

import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
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
        <Pill text={strings('confirm.all')} />
        <Address
          address={transactionMetadata?.txParams?.to ?? ''}
          chainId={transactionMetadata?.chainId ?? ''}
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
    <Address
      address={spender ?? ''}
      chainId={transactionMetadata?.chainId ?? ''}
    />
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
    <Address
      address={spender ?? ''}
      chainId={transactionMetadata?.chainId ?? ''}
    />
  </InfoRow>
);

export const SetApprovalForAll = () => {
  const { tokenStandard, isRevoke, spender } = useApproveTransactionData();
  const transactionMetadata = useTransactionMetadataRequest();
  const isERC721 = tokenStandard === TokenStandard.ERC721;
  const isERC1155 = tokenStandard === TokenStandard.ERC1155;
  const shouldShow = isERC721 || isERC1155;

  if (!shouldShow) {
    return null;
  }

  if (isRevoke) {
    return (
      <>
        <NFTInfoRow
          transactionMetadata={transactionMetadata as TransactionMeta}
        />
        <PermissionFromInfoRow
          spender={spender}
          transactionMetadata={transactionMetadata as TransactionMeta}
        />
      </>
    );
  }

  return (
    <>
      <NFTInfoRow
        transactionMetadata={transactionMetadata as TransactionMeta}
      />
      <SpenderInfoRow
        spender={spender}
        transactionMetadata={transactionMetadata as TransactionMeta}
      />
    </>
  );
};
