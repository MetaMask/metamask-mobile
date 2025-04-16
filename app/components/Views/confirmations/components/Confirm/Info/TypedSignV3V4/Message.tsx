import React, { useMemo } from 'react';
import { Hex, isValidHexAddress } from '@metamask/utils';
import { View } from 'react-native';

import { strings } from '../../../../../../../../locales/i18n';
import { useSignatureRequest } from '../../../../hooks/useSignatureRequest';
import Text from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../component-library/hooks';
import { useTypedSignSimulationEnabled } from '../../../../hooks/useTypedSignSimulationEnabled';
import { parseAndSanitizeSignTypedData } from '../../../../utils/signature';
import InfoRow from '../../../UI/InfoRow';
import { useTokenDecimalsInTypedSignRequest } from '../../../../hooks/useTokenDecimalsInTypedSignRequest';
import DataTree from '../../DataTree';
import SignatureMessageSection from '../../SignatureMessageSection';
import { DataTreeInput } from '../../DataTree/DataTree';
import styleSheet from './Message.styles';

/**
 * If a token contract is found within the dataTree, fetch the token decimal of this contract
 * to be utilized for displaying token amounts of the dataTree.
 *
 * @param dataTreeData
 */
export const getTokenContractInDataTree = (
  dataTreeData: DataTreeInput,
): Hex | undefined => {
  if (!dataTreeData || Array.isArray(dataTreeData)) {
    return undefined;
  }

  const tokenContract = dataTreeData.token?.value as Hex;
  if (!tokenContract || !isValidHexAddress(tokenContract)) {
    return undefined;
  }

  return tokenContract;
};

const Message = () => {
  const signatureRequest = useSignatureRequest();
  const isSimulationSupported = useTypedSignSimulationEnabled();
  const chainId = signatureRequest?.chainId as Hex;
  const { styles } = useStyles(styleSheet, {});

  // Pending alignment of controller types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedSignData = signatureRequest?.messageParams?.data as any;

  const {
    domain: { verifyingContract } = { verifyingContract: '' },
    sanitizedMessage,
    primaryType,
  } = useMemo(
    () => parseAndSanitizeSignTypedData(typedSignData),
    [typedSignData],
  );

  const tokenDecimals = useTokenDecimalsInTypedSignRequest(
    signatureRequest,
    sanitizedMessage?.value as unknown as DataTreeInput,
    verifyingContract,
  );

  if (!signatureRequest) {
    return null;
  }

  return (
    <SignatureMessageSection
      messageCollapsed={
        isSimulationSupported ? undefined : (
          <InfoRow
            label={strings('confirm.label.primary_type')}
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
            label={strings('confirm.label.primary_type')}
            style={styles.dataRow}
          >
            {primaryType}
          </InfoRow>
          <DataTree
            data={sanitizedMessage?.value as unknown as DataTreeInput}
            chainId={chainId}
            primaryType={primaryType}
            tokenDecimals={tokenDecimals}
          />
        </View>
      }
      copyMessageText={typedSignData}
    />
  );
};

export default Message;
