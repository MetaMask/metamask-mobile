import React, { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { hexToText } from '@metamask/controller-utils';

import { Theme } from '../../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../../styles/common';
import { useStyles } from '../../../../../../../component-library/hooks';
import { sanitizeString } from '../../../../../../../util/string';
import { getSIWEDetails } from '../../../../utils/signatures';
import { useSignatureRequest } from '../../../../hooks/useSignatureRequest';
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
  const signatureRequest = useSignatureRequest();
  const { styles } = useStyles(styleSheet, {});

  const message = useMemo(() => {
    if (!signatureRequest?.messageParams?.data) {
      return '';
    }
    const { isSIWEMessage, parsedMessage } = getSIWEDetails(signatureRequest);
    if (isSIWEMessage) {
      return parsedMessage?.statement ?? '';
    }
    return sanitizeString(
      hexToText(signatureRequest?.messageParams?.data as string),
    );
  }, [signatureRequest]);

  return (
    <SignatureMessageSection
      messageCollapsed={message}
      messageExpanded={<Text style={styles.messageExpanded}>{message}</Text>}
      copyMessageText={message}
      collapsedSectionAllowMultiline
    />
  );
};

export default Message;
