import React from 'react';
import { StyleSheet } from 'react-native';

import { strings } from '../../../../../../../../locales/i18n';
import { parseSanitizeTypedDataMessage } from '../../../../utils/signatures';
import InfoRow from '../../../UI/InfoRow';
import DataTree from '../../DataTree';
import SignatureMessageSection from '../../SignatureMessageSection';
import { DataTreeInput } from '../../DataTree/DataTree';
import { useSignatureRequest } from '../../../../hooks/useSignatureRequest';
import { Hex } from '@metamask/utils';

const styles = StyleSheet.create({
  collpasedInfoRow: {
    marginStart: -8,
  },
});

const Message = () => {
  const signatureRequest = useSignatureRequest();
  const chainId = signatureRequest?.chainId as Hex;

  // Pending alignment of controller types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedSignData = signatureRequest?.messageParams?.data as any;

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
