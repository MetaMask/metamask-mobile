import { ApprovalRequest } from '@metamask/approval-controller';
import { ApprovalType } from '@metamask/controller-utils';
import { SignatureRequest } from '@metamask/signature-controller';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import React from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../../locales/i18n';
import Text from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import {
  EARN_CONTRACT_INTERACTION_TYPES,
  MMM_ORIGIN,
  REDESIGNED_APPROVE_TYPES,
  REDESIGNED_TRANSFER_TYPES,
} from '../../constants/confirmations';
import { use7702TransactionType } from '../../hooks/7702/use7702TransactionType';
import { useSignatureRequest } from '../../hooks/signatures/useSignatureRequest';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { useFullScreenConfirmation } from '../../hooks/ui/useFullScreenConfirmation';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import {
  isPermitDaiRevoke,
  isRecognizedPermit,
  isSIWESignatureRequest,
  parseAndNormalizeSignTypedDataFromSignatureRequest,
} from '../../utils/signature';
import { BatchedTransactionTag } from '../batched-transactions-tag';
import styleSheet from './title.styles';

const getTitleAndSubTitle = (
  approvalRequest?: ApprovalRequest<{ data: string }>,
  signatureRequest?: SignatureRequest,
  transactionMetadata?: TransactionMeta,
  isDowngrade: boolean = false,
  isBatched: boolean = false,
  isUpgradeOnly: boolean = false,
) => {
  const type = approvalRequest?.type;
  const transactionType = transactionMetadata?.type as TransactionType;

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
        const parsedData =
          parseAndNormalizeSignTypedDataFromSignatureRequest(signatureRequest);
        const { allowed, tokenId, value } = parsedData.message ?? {};
        const { verifyingContract } = parsedData.domain ?? {};

        const isERC721Permit = tokenId !== undefined;
        if (isERC721Permit) {
          return {
            title: strings('confirm.title.permit_NFTs'),
            subTitle: strings('confirm.sub_title.permit_NFTs'),
          };
        }

        const isDaiRevoke = isPermitDaiRevoke(
          verifyingContract,
          allowed,
          value,
        );
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
      if (isDowngrade || isUpgradeOnly) {
        return {
          title: strings('confirm.title.switch_account_type'),
          subTitle: isDowngrade
            ? strings('confirm.sub_title.switch_to_standard_account')
            : strings('confirm.sub_title.switch_to_smart_account'),
        };
      }
      if (REDESIGNED_TRANSFER_TYPES.includes(transactionType)) {
        return {
          title: strings('confirm.title.transfer'),
        };
      }
      if (REDESIGNED_APPROVE_TYPES.includes(transactionType)) {
        return {
          title: strings('confirm.title.approve'),
        };
      }

      if (transactionType === TransactionType.deployContract) {
        return {
          title: strings('confirm.title.contract_deployment'),
          subTitle: strings('confirm.sub_title.contract_deployment'),
        };
      }

      // Default to contract interaction
      const shouldHideSubTitle =
        isBatched || EARN_CONTRACT_INTERACTION_TYPES.includes(transactionType);
      return {
        title: strings('confirm.title.contract_interaction'),
        subTitle: shouldHideSubTitle
          ? undefined
          : strings('confirm.sub_title.contract_interaction'),
      };
    }
    case ApprovalType.TransactionBatch: {
      const isWalletInitiated = approvalRequest?.origin === MMM_ORIGIN;
      if (!isWalletInitiated) {
        return {
          title: strings('confirm.title.contract_interaction'),
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
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const transactionMetadata = useTransactionMetadataRequest();
  const { isDowngrade, isBatched, isUpgradeOnly } = use7702TransactionType();

  if (isFullScreenConfirmation) {
    return null;
  }

  const { title, subTitle } = getTitleAndSubTitle(
    approvalRequest,
    signatureRequest,
    transactionMetadata,
    isDowngrade,
    isBatched,
    isUpgradeOnly,
  );

  return (
    <View style={styles.titleContainer}>
      <Text style={styles.title}>{title}</Text>
      {subTitle && <Text style={styles.subTitle}>{subTitle}</Text>}
      <BatchedTransactionTag />
    </View>
  );
};

export default Title;
