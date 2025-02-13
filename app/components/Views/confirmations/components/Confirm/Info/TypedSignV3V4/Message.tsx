import React from 'react';
import { Hex } from '@metamask/utils';
import { View } from 'react-native';

import { parseSanitizeTypedDataMessage } from '../../../../utils/signatures';
import { strings } from '../../../../../../../../locales/i18n';
import { useSignatureRequest } from '../../../../hooks/useSignatureRequest';
import Text from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../component-library/hooks';
import { useTypedSignSimulationEnabled } from '../../../../hooks/useTypedSignSimulationEnabled';
import InfoRow from '../../../UI/InfoRow';
import DataTree from '../../DataTree';
import SignatureMessageSection from '../../SignatureMessageSection';
import { DataTreeInput } from '../../DataTree/DataTree';
import styleSheet from './Message.styles';

const Message = () => {
  const signatureRequest = useSignatureRequest();
  const isSimulationSupported = useTypedSignSimulationEnabled();
  const chainId = signatureRequest?.chainId as Hex;
  const { styles } = useStyles(styleSheet, {});

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
        isSimulationSupported ? undefined : (
          <InfoRow
            label={strings('confirm.primary_type')}
            style={styles.collpasedInfoRow}
          >
            {primaryType}
          </InfoRow>
        )
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
            primaryType={primaryType}
          />
        </View>
      }
      copyMessageText={typedSignData}
    />
  );
};

export default Message;
