import React from 'react';
import { SignatureRequest } from '@metamask/signature-controller';
import { Text, View } from 'react-native';
import { TransactionType } from '@metamask/transaction-controller';

import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import useApprovalRequest from '../../../hooks/useApprovalRequest';
import { isSIWESignatureRequest } from '../../../utils/signature';
import { useSignatureRequest } from '../../../hooks/useSignatureRequest';
import styleSheet from './Title.styles';

const getTitleAndSubTitle = (
  confirmationType?: string,
  signatureRequest?: SignatureRequest,
) => {
  switch (confirmationType) {
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
    case TransactionType.signTypedData:
      return {
        title: strings('confirm.title.signature'),
        subTitle: strings('confirm.sub_title.signature'),
      };
    default:
      return {};
  }
};

const Title = () => {
  const { approvalRequest } = useApprovalRequest();
  const signatureRequest = useSignatureRequest();
  const { styles } = useStyles(styleSheet, {});

  const { title, subTitle } = getTitleAndSubTitle(
    approvalRequest?.type,
    signatureRequest,
  );

  return (
    <View style={styles.titleContainer}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subTitle}>{subTitle}</Text>
    </View>
  );
};

export default Title;
