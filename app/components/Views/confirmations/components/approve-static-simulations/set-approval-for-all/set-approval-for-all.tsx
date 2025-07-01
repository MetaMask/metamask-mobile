import React from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useApproveTransactionData } from '../../../hooks/useApproveTransactionData';
import { TokenStandard } from '../../../types/token';
import InfoRow from '../../UI/info-row/info-row';
import Address from '../../UI/info-row/info-value/address';
import { Pill } from '../../UI/pill';
import styleSheet from '../shared-styles';

export const SetApprovalForAll = () => {
  const { styles } = useStyles(styleSheet, {});
  const { tokenStandard, isRevoke, spender } = useApproveTransactionData();
  const transactionMetadata = useTransactionMetadataRequest();
  const isERC721 = tokenStandard === TokenStandard.ERC721;
  const isERC1155 = tokenStandard === TokenStandard.ERC1155;
  const shouldShow = isERC721 || isERC1155;

  if (!shouldShow) {
    return null;
  }

  const renderNFTInfoRow = () => {
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

  const renderPermissionFromInfoRow = () => {
    return (
      <InfoRow label={strings('confirm.permission_from')}>
        <Address
          address={spender ?? ''}
          chainId={transactionMetadata?.chainId ?? ''}
        />
      </InfoRow>
    );
  };

  const renderSpenderInfoRow = () => {
    return (
      <InfoRow label={strings('confirm.spender')}>
        <Address
          address={spender ?? ''}
          chainId={transactionMetadata?.chainId ?? ''}
        />
      </InfoRow>
    );
  };

  if (isRevoke) {
    return (
      <>
        {renderNFTInfoRow()}
        {renderPermissionFromInfoRow()}
      </>
    );
  }

  return (
    <>
      {renderNFTInfoRow()}
      {renderSpenderInfoRow()}
    </>
  );
};
