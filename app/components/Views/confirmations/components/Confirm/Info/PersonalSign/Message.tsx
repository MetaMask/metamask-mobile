import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { hexToText } from '@metamask/controller-utils';

import Text from '../../../../../../../component-library/components/Texts/Text';
import { Theme } from '../../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../../styles/common';
import { useStyles } from '../../../../../../../component-library/hooks';
import { sanitizeString } from '../../../../../../../util/string';
import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import SignatureMessageSection from '../../SignatureMessageSection';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    messageExpanded: {
      color: theme.colors.text.default,
      ...fontStyles.normal,
      fontSize: 14,
      fontWeight: '400',
    },
  });
};

const Message = () => {
  const { approvalRequest } = useApprovalRequest();
  const { styles } = useStyles(styleSheet, {});

  const message = useMemo(
    () => sanitizeString(hexToText(approvalRequest?.requestData?.data)),
    [approvalRequest?.requestData?.data],
  );

  return (
    <SignatureMessageSection
      messageCollapsed={message}
      messageExpanded={<Text style={styles.messageExpanded}>{message}</Text>}
      copyMessageText={message}
    />
  );
};

export default Message;
