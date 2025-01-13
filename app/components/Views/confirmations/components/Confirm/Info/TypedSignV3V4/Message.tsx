import React from 'react';
import { StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../../../locales/i18n';
import { selectChainId } from '../../../../../../../selectors/networkController';
import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import { parseSanitizeTypedDataMessage } from '../../../../utils/signatures';
import InfoRow from '../../../UI/InfoRow';
import DataTree from '../../DataTree';
import SignatureMessageSection from '../../SignatureMessageSection';
import { DataTreeInput } from '../../DataTree/DataTree';

const styles = StyleSheet.create({
  collpasedInfoRow: {
    marginStart: -8,
  },
});

const Message = () => {
  const { approvalRequest } = useApprovalRequest();
  const chainId = useSelector(selectChainId);

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
        <DataTree
          data={sanitizedMessage.value as unknown as DataTreeInput}
          chainId={chainId}
        />
      }
      copyMessageText={typedSignData}
    />
  );
};

export default Message;
