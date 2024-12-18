import React from 'react';
import { useSelector } from 'react-redux';
import { StyleSheet, View } from 'react-native';

import { strings } from '../../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../../component-library/hooks';
import { selectChainId } from '../../../../../../../../selectors/networkController';
import { safeToChecksumAddress } from '../../../../../../../../util/address';
import { PrimaryType } from '../../../../../constants/signatures';
import useApprovalRequest from '../../../../../hooks/useApprovalRequest';
import { parseTypedDataMessage } from '../../../../../utils/signature';
import InfoRow from '../../../../UI/InfoRow';
import InfoSection from '../../../../UI/InfoRow/InfoSection';
import PermitSimulationValueDisplay from './ValueDisplay';

const styleSheet = () =>
  StyleSheet.create({
    permitValues: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    },
  });

function extractTokenDetailsByPrimaryType(
  message: Record<string, unknown>,
  primaryType: PrimaryType,
): object[] | unknown {
  let tokenDetails;

  switch (primaryType) {
    case PrimaryType.PermitBatch:
    case PrimaryType.PermitSingle:
      tokenDetails = message?.details;
      break;
    case PrimaryType.PermitBatchTransferFrom:
    case PrimaryType.PermitTransferFrom:
      tokenDetails = message?.permitted;
      break;
    default:
      break;
  }

  const isNonArrayObject = tokenDetails && !Array.isArray(tokenDetails);
  return isNonArrayObject ? [tokenDetails] : tokenDetails;
}

const PermitSimulation = () => {
  const { styles } = useStyles(styleSheet, {});

  const { approvalRequest } = useApprovalRequest();

  // TODO: update logic to use chainId from approvalRequest. SignatureController needs to be updated prior
  const chainId = useSelector(selectChainId);

  const msgData = approvalRequest?.requestData?.data;

  if (!msgData) {
    return null;
  }

  const {
    domain: { verifyingContract },
    message,
    message: { tokenId },
    primaryType,
  } = parseTypedDataMessage(msgData as string);

  const tokenDetails = extractTokenDetailsByPrimaryType(message, primaryType);

  const isNFT = tokenId !== undefined;
  const labelChangeType = isNFT
    ? strings('confirm.simulation.label_change_type_permit_nft')
    : strings('confirm.simulation.label_change_type_permit');

  return (
    <InfoSection>
      <InfoRow
        label={strings('confirm.simulation.title')}
        tooltip={strings('confirm.simulation.tooltip')}
      >
        {strings('confirm.simulation.info_permit')}
      </InfoRow>

      <InfoRow label={labelChangeType}>
        {Array.isArray(tokenDetails) ? (
          <View style={styles.permitValues}>
            {tokenDetails.map(
              (
                { token, amount }: { token: string; amount: string },
                i: number,
              ) => (
                <PermitSimulationValueDisplay
                  key={`${token}-${i}`}
                  labelChangeType={labelChangeType}
                  primaryType={primaryType}
                  tokenContract={safeToChecksumAddress(token)}
                  value={amount}
                  chainId={chainId}
                />
              ),
            )}
          </View>
        ) : (
          <PermitSimulationValueDisplay
            labelChangeType={labelChangeType}
            tokenContract={verifyingContract}
            value={message.value}
            tokenId={message.tokenId}
            chainId={chainId}
          />
        )}
      </InfoRow>
    </InfoSection>
  );
};

export default PermitSimulation;
