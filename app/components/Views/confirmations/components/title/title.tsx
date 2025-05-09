import { ApprovalRequest } from '@metamask/approval-controller';
import { SignatureRequest } from '@metamask/signature-controller';
import { TransactionMeta, TransactionType } from '@metamask/transaction-controller';
import React from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../../locales/i18n';
import Text from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { useSignatureRequest } from '../../hooks/signatures/useSignatureRequest';
import { useStandaloneConfirmation } from '../../hooks/ui/useStandaloneConfirmation';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { isPermitDaiRevoke, isRecognizedPermit, isSIWESignatureRequest, parseTypedDataMessageFromSignatureRequest } from '../../utils/signature';
import styleSheet from './title.styles';
import { ApprovalType } from '@metamask/controller-utils';

const getTitleAndSubTitle = (
  approvalRequest?: ApprovalRequest<{ data: string }>,
  signatureRequest?: SignatureRequest,
  transactionMetadata?: TransactionMeta,
) => {
  const type = approvalRequest?.type;

  switch (type) {
    case ApprovalType.PersonalSign: {
      if (isSIWESignatureRequest(signatureRequest)) {
        return {
          title: strings('confirm.title.signature_siwe'),
          subTitle: strings('confirm.sub_title.signature_siwe'),
        };
      }
      return {
        title: strings('confirm.title.signature'),
        subTitle: strings('confirm.sub_title.signature'),
      };
    }
    case ApprovalType.EthSignTypedData: {
      const isPermit = isRecognizedPermit(signatureRequest);

      if (isPermit) {
        const parsedMessage = parseTypedDataMessageFromSignatureRequest(signatureRequest) ?? {};
        const { allowed, tokenId, value } = parsedMessage?.message ?? {};
        const { verifyingContract } = parsedMessage?.domain ?? {};

        const isERC721Permit = tokenId !== undefined;
        if (isERC721Permit) {
          return {
            title: strings('confirm.title.permit_NFTs'),
            subTitle: strings('confirm.sub_title.permit_NFTs'),
          };
        }

        const isDaiRevoke = isPermitDaiRevoke(verifyingContract, allowed, value);
        const isRevoke = isDaiRevoke || value === '0';

        if (isRevoke) {
          return {
            title: strings('confirm.title.permit_revoke'),
          };
        }

        return {
          title: strings('confirm.title.permit'),
          subTitle: strings('confirm.sub_title.permit'),
        };
      }

      return {
        title: strings('confirm.title.signature'),
        subTitle: strings('confirm.sub_title.signature'),
      };
    }
    case ApprovalType.Transaction: {
      if (transactionMetadata?.type === TransactionType.contractInteraction) {
        return {
          title: strings('confirm.title.contract_interaction'),
          subTitle: strings('confirm.sub_title.contract_interaction'),
        };
      }
      return {};
    }
    default:
      return {};
  }
};

const Title = () => {
  const { approvalRequest } = useApprovalRequest();
  const signatureRequest = useSignatureRequest();
  const { styles } = useStyles(styleSheet, {});
  const { isStandaloneConfirmation } = useStandaloneConfirmation();
  const transactionMetadata = useTransactionMetadataRequest();

  if (isStandaloneConfirmation) {
    return null;
  }

  const { title, subTitle } = getTitleAndSubTitle(
    approvalRequest,
    signatureRequest,
    transactionMetadata,
  );

  return (
    <View style={styles.titleContainer}>
      <Text style={styles.title}>{title}</Text>
      {subTitle && <Text style={styles.subTitle}>{subTitle}</Text>}
    </View>
  );
};

export default Title;
