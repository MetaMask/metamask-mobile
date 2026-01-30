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
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import {
  EARN_CONTRACT_INTERACTION_TYPES,
  MMM_ORIGIN,
  APPROVE_TRANSACTION_TYPES,
  TRANSFER_TRANSACTION_TYPES,
} from '../../constants/confirmations';
import { ApproveMethod } from '../../types/approve';
import { use7702TransactionType } from '../../hooks/7702/use7702TransactionType';
import { useSignatureRequest } from '../../hooks/signatures/useSignatureRequest';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { useFullScreenConfirmation } from '../../hooks/ui/useFullScreenConfirmation';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import {
  type ApproveTransactionData,
  useApproveTransactionData,
} from '../../hooks/useApproveTransactionData';
import {
  isPermitDaiRevoke,
  isRecognizedPermit,
  isSIWESignatureRequest,
  parseAndNormalizeSignTypedDataFromSignatureRequest,
} from '../../utils/signature';
import { BatchedTransactionTag } from '../batched-transactions-tag';
import styleSheet from './title.styles';
import { TokenStandard } from '../../types/token';

const getApproveTitle = (approveTransactionData?: ApproveTransactionData) => {
  const { isRevoke, tokenStandard } = approveTransactionData ?? {};
  let title = strings('confirm.title.permit');
  let subTitle = strings('confirm.sub_title.permit');

  if (tokenStandard === TokenStandard.ERC20) {
    if (isRevoke) {
      title = strings('confirm.title.permit_revoke');
      subTitle = strings('confirm.sub_title.permit_revoke');
    }
  }
  if (
    tokenStandard === TokenStandard.ERC721 ||
    tokenStandard === TokenStandard.ERC1155
  ) {
    title = strings('confirm.title.permit_NFTs');
    subTitle = strings('confirm.sub_title.permit_NFTs');

    if (isRevoke) {
      title = strings('confirm.title.permit_revoke');
      subTitle = strings('confirm.sub_title.permit_revoke_NFTs');
    }
  }

  if (
    approveTransactionData?.approveMethod === ApproveMethod.DECREASE_ALLOWANCE
  ) {
    title = strings('confirm.title.permit');
    subTitle = strings('confirm.sub_title.decrease_allowance');
  }

  return {
    title,
    subTitle,
  };
};

const getTitleAndSubTitle = (
  approvalRequest?: ApprovalRequest<{ data: string }>,
  signatureRequest?: SignatureRequest,
  transactionMetadata?: TransactionMeta,
  isDowngrade: boolean = false,
  isBatched: boolean = false,
  isUpgradeOnly: boolean = false,
  approveTransactionData?: ApproveTransactionData,
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
      if (TRANSFER_TRANSACTION_TYPES.includes(transactionType)) {
        return {
          title: strings('confirm.title.transfer'),
        };
      }
      if (APPROVE_TRANSACTION_TYPES.includes(transactionType)) {
        const { title, subTitle } = getApproveTitle(approveTransactionData);
        return {
          title,
          subTitle,
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
  const approveTransactionData = useApproveTransactionData();

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
    approveTransactionData,
  );

  return (
    <View style={styles.titleContainer}>
      <Text style={styles.title} variant={TextVariant.HeadingMD}>
        {title}
      </Text>
      {subTitle && (
        <Text
          style={styles.subTitle}
          color={TextColor.Alternative}
          variant={TextVariant.BodyMD}
        >
          {subTitle}
        </Text>
      )}
      <BatchedTransactionTag />
    </View>
  );
};

export default Title;
