import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { hexToText } from '@metamask/controller-utils';

import { sanitizeString } from '../../../../../../../../util/string';
import { strings } from '../../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../../component-library/hooks';
import useApprovalRequest from '../../../../../hooks/useApprovalRequest';
import ExpandableSection from '../../../../UI/ExpandableSection';
import styleSheet from './Message.styles';
import CopyButton from '../../../../UI/CopyButton';

const Message = () => {
  const { approvalRequest } = useApprovalRequest();
  const { styles } = useStyles(styleSheet, {});

  const message = useMemo(
    () => sanitizeString(hexToText(approvalRequest?.requestData?.data)),
    [approvalRequest?.requestData?.data],
  );

  return (
    <ExpandableSection
      collapsedContent={
        <View style={styles.container}>
          <Text style={styles.title}>{strings('confirm.message')}</Text>
          <Text style={styles.description} numberOfLines={1}>
            {message}
          </Text>
        </View>
      }
      expandedContent={
        <View style={styles.messageContainer}>
          <View style={styles.copyButtonContainer}>
            <CopyButton copyText={message} />
          </View>
          <Text style={styles.messageExpanded}>{message}</Text>
        </View>
      }
      expandedContentTitle={strings('confirm.message')}
    />
  );
};

export default Message;
