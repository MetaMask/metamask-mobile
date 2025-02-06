import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Hex } from '@metamask/utils';

import { strings } from '../../../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../../../component-library/hooks';
import Engine from '../../../../../../../../../core/Engine';
import { safeToChecksumAddress } from '../../../../../../../../../util/address';
import { PrimaryType } from '../../../../../../constants/signatures';
import { useSignatureRequest } from '../../../../../../hooks/useSignatureRequest';
import { parseTypedDataMessage } from '../../../../../../utils/signature';
import InfoRow from '../../../../../UI/InfoRow';
import InfoSection from '../../../../../UI/InfoRow/InfoSection';
import PermitSimulationValueDisplay from '../components/ValueDisplay';

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
  const { NetworkController } = Engine.context;
  const { styles } = useStyles(styleSheet, {});

  const signatureRequest = useSignatureRequest();

  const chainId = signatureRequest?.chainId as Hex;
  const msgData = signatureRequest?.messageParams?.data;

  const networkClientId = NetworkController.findNetworkClientIdByChainId(
    chainId as Hex,
  );

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
                  modalHeaderText={labelChangeType}
                  networkClientId={networkClientId}
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
            modalHeaderText={labelChangeType}
            networkClientId={networkClientId}
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
