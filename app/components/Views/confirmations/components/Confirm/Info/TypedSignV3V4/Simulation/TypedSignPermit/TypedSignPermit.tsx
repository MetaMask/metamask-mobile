import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Hex } from '@metamask/utils';

import { strings } from '../../../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../../../component-library/hooks';
import Engine from '../../../../../../../../../core/Engine';
import { safeToChecksumAddress } from '../../../../../../../../../util/address';
import { PrimaryType } from '../../../../../../constants/signatures';
import { useSignatureRequest } from '../../../../../../hooks/useSignatureRequest';
import { isPermitDaiRevoke, parseTypedDataMessage } from '../../../../../../utils/signature';
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
    message: { allowed, tokenId },
    primaryType,
  } = parseTypedDataMessage(msgData as string);

  const tokenDetails = extractTokenDetailsByPrimaryType(message, primaryType);

  const isNFT = tokenId !== undefined && tokenId !== '0';

  let labelChangeType = isNFT
    ? strings('confirm.simulation.label_change_type_permit_nft')
      : strings('confirm.simulation.label_change_type_permit');

  const isDaiRevoke = isPermitDaiRevoke(verifyingContract, allowed);

  if (isDaiRevoke) {
    labelChangeType = strings('confirm.simulation.label_change_type_revoke');
  }

  const infoText = isDaiRevoke
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
                { allowed: tokenDetailAllowed, token, amount }: { allowed: string, token: string; amount: string },
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
