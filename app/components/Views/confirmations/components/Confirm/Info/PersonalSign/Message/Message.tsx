import React, { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { hexToText } from '@metamask/controller-utils';

import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../../../component-library/components/Buttons/ButtonIcon';
import ClipboardManager from '../../../../../../../../core/ClipboardManager';
import {
  IconColor,
  IconName,
} from '../../../../../../../../component-library/components/Icons/Icon';
import { sanitizeString } from '../../../../../../../../util/string';
import { strings } from '../../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../../component-library/hooks';
import useApprovalRequest from '../../../../../hooks/useApprovalRequest';
import ExpandableSection from '../../../../UI/ExpandableSection';
import styleSheet from './Message.styles';

const Message = () => {
  const { approvalRequest } = useApprovalRequest();
  const [copied, setCopied] = useState(false);
  const { styles } = useStyles(styleSheet, {});

  const message = useMemo(
    () => sanitizeString(hexToText(approvalRequest?.requestData?.data)),
    [approvalRequest?.requestData?.data],
  );

  const copyMessage = useCallback(async () => {
    await ClipboardManager.setString(message);
    setCopied(true);
  }, [message, setCopied]);

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
          <ButtonIcon
            iconColor={IconColor.Muted}
            size={ButtonIconSizes.Sm}
            onPress={copyMessage}
            iconName={copied ? IconName.CopySuccess : IconName.Copy}
            style={styles.copyButton}
            testID="copyButtonTestId"
          />
          <Text style={styles.messageExpanded}>{message}</Text>
        </View>
      }
      expandedContentTitle={strings('confirm.message')}
    />
  );
};

export default Message;
