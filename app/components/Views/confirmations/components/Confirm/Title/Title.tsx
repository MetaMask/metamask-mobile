import React from 'react';
import { View } from 'react-native';
import { TransactionType } from '@metamask/transaction-controller';

import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import Text from '../../../../../../component-library/components/Texts/Text';
import useApprovalRequest from '../../../hooks/useApprovalRequest';
import styleSheet from './Title.styles';

const getTitleAndSubTitle = (confirmationType?: string) => {
  switch (confirmationType) {
    case TransactionType.personalSign:
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
  const { styles } = useStyles(styleSheet, {});

  const { title, subTitle } = getTitleAndSubTitle(approvalRequest?.type);

  return (
    <View style={styles.titleContainer}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subTitle}>{subTitle}</Text>
    </View>
  );
};

export default Title;
