import React from 'react';
import { Text, View } from 'react-native';
import { useSelector } from 'react-redux';

import { selectChainId } from '../../../../../../../selectors/networkController';
import { strings } from '../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../component-library/hooks';
import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import { parseSanitizeTypedDataMessage } from '../../../../utils/signatures';
import InfoRow from '../../../UI/InfoRow';
import DataTree from '../../DataTree';
import SignatureMessageSection from '../../SignatureMessageSection';
import { DataTreeInput } from '../../DataTree/DataTree';
import styleSheet from './Message.styles';

const Message = () => {
  const { approvalRequest } = useApprovalRequest();
  const chainId = useSelector(selectChainId);
  const { styles } = useStyles(styleSheet, {});

  const typedSignData = approvalRequest?.requestData?.data;

  if (!typedSignData) {
    return null;
  }

  const { sanitizedMessage, primaryType } =
    parseSanitizeTypedDataMessage(typedSignData);

  return (
    <SignatureMessageSection
      messageCollapsed={
        <InfoRow
          label={strings('confirm.primary_type')}
          style={styles.collpasedInfoRow}
        >
          {primaryType}
        </InfoRow>
      }
      messageExpanded={
        <View>
          <Text style={styles.title}>{strings('confirm.message')}</Text>
          <InfoRow
            label={strings('confirm.primary_type')}
            style={styles.dataRow}
          >
            {primaryType}
          </InfoRow>
          <DataTree
            data={sanitizedMessage.value as unknown as DataTreeInput}
            chainId={chainId}
          />
        </View>
      }
      copyMessageText={typedSignData}
    />
  );
};

export default Message;
