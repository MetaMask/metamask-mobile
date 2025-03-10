import React from 'react';
import { View } from 'react-native';
import { ApprovalRequest } from '@metamask/approval-controller';
import { SignatureRequest } from '@metamask/signature-controller';
import { TransactionType } from '@metamask/transaction-controller';

import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import Text from '../../../../../../component-library/components/Texts/Text';
import useApprovalRequest from '../../../hooks/useApprovalRequest';
import { useSignatureRequest } from '../../../hooks/useSignatureRequest';
import { isSIWESignatureRequest , isRecognizedPermit, parseTypedDataMessageFromSignatureRequest, isPermitDaiRevoke } from '../../../utils/signature';
import { useStandaloneConfirmation } from '../../../hooks/useStandaloneConfirmation';
import styleSheet from './Title.styles';

const getTitleAndSubTitle = (approvalRequest?: ApprovalRequest<{ data: string }>, signatureRequest?: SignatureRequest) => {
  const type = approvalRequest?.type;

  switch (type) {
    case TransactionType.personalSign: {
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
    case TransactionType.signTypedData: {
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
    default:
      return {};
  }
};

const Title = () => {
  const { approvalRequest } = useApprovalRequest();
  const signatureRequest = useSignatureRequest();
  const { styles } = useStyles(styleSheet, {});
  const { isStandaloneConfirmation } = useStandaloneConfirmation();

  if (isStandaloneConfirmation) {
    return null;
  }

  const { title, subTitle } = getTitleAndSubTitle(approvalRequest, signatureRequest);

  return (
    <View style={styles.titleContainer}>
      <Text style={styles.title}>{title}</Text>
      {subTitle && <Text style={styles.subTitle}>{subTitle}</Text>}
    </View>
  );
};

export default Title;
