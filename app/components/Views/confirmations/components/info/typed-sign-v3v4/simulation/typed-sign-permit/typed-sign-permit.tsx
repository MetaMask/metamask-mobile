import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Hex } from '@metamask/utils';

import { strings } from '../../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../../component-library/hooks';
import Engine from '../../../../../../../../core/Engine';
import { safeToChecksumAddress } from '../../../../../../../../util/address';
import { PrimaryType } from '../../../../../constants/signatures';
import { useSignatureRequest } from '../../../../../hooks/signatures/useSignatureRequest';
import { isPermitDaiRevoke, parseSignTypedData } from '../../../../../utils/signature';
import InfoRow from '../../../../UI/info-row';
import InfoSection from '../../../../UI/info-row/info-section';
import PermitSimulationValueDisplay from '../components/value-display';

const styleSheet = () =>
  StyleSheet.create({
    permitValues: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    },
  });

interface TokenDetails {
  allowed?: string;
  amount: string;
  token: string;
  // ... other properties may exist
}

function extractTokenDetailsByPrimaryType(
  message: Record<string, unknown>,
  primaryType: PrimaryType,
): TokenDetails[] | unknown {
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
    message: { allowed, tokenId, value },
    primaryType,
  } = parseSignTypedData(msgData as string);

  const tokenDetails = extractTokenDetailsByPrimaryType(message, primaryType);

  const isNFT = tokenId !== undefined && tokenId !== '0';

  let labelChangeType = isNFT
    ? strings('confirm.simulation.label_change_type_permit_nft')
      : strings('confirm.simulation.label_change_type_permit');

  const isDaiRevoke = isPermitDaiRevoke(verifyingContract, allowed, value);
  const isRevoke = isDaiRevoke || value === '0';

  if (isRevoke) {
    labelChangeType = strings('confirm.simulation.label_change_type_revoke');
  }

  const infoText = isRevoke
    ? strings('confirm.simulation.info_revoke')
    : strings('confirm.simulation.info_permit');

  return (
    <InfoSection>
      <InfoRow
        label={strings('confirm.simulation.title')}
        tooltip={strings('confirm.simulation.tooltip')}
      >
        {infoText}
      </InfoRow>

      <InfoRow label={labelChangeType}>
        {Array.isArray(tokenDetails) ? (
          <>
            {tokenDetails.map(
              (
                { allowed: tokenDetailAllowed, token, amount },
                i: number,
              ) => {
                const tokenContract = safeToChecksumAddress(token);

                return (
                  <View style={styles.permitValues} key={`${token}-${i}`}>
                    <PermitSimulationValueDisplay
                      modalHeaderText={labelChangeType}
                      networkClientId={networkClientId}
                      primaryType={primaryType}
                      tokenContract={tokenContract}
                      value={amount}
                      chainId={chainId}
                      allowed={tokenDetailAllowed}
                    />
                  </View>
                );
              },
            )}
          </>
        ) : (
          <PermitSimulationValueDisplay
            modalHeaderText={labelChangeType}
            networkClientId={networkClientId}
            tokenContract={verifyingContract}
            allowed={message.allowed}
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
