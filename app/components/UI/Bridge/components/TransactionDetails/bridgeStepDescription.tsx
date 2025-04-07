import React from 'react';
import { NetworkConfiguration } from '@metamask/network-controller';
import { Hex } from '@metamask/utils';
import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { ActionTypes, BridgeHistoryItem, StatusTypes } from '@metamask/bridge-status-controller';
import { decimalToPrefixedHex } from '../../../../../util/conversions';
import { AllowedBridgeChainIds, NETWORK_TO_SHORT_NETWORK_NAME_MAP } from '../../../../../constants/bridge';
import { Box } from '../../../Box/Box';
import { AlignItems, FlexDirection } from '../../../Box/box.types';
import Text, { TextColor, TextVariant } from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import { StyleSheet } from 'react-native';
import { Step } from '@metamask/bridge-controller';

/**
 * bridge actions will have step.srcChainId !== step.destChainId
 * We cannot infer the status of the bridge action since 2 different chains are involved
 * The best we can do is the bridgeHistoryItem.estimatedProcessingTimeInSeconds
 *
 * @param t - The i18n context return value to get translations
 * @param stepStatus - The status of the step
 * @param step - The step to be rendered
 * @param networkConfigurationsByChainId - The network configurations by chain id
 */
const getBridgeActionText = (
  stepStatus: StatusTypes | null,
  step: Step,
  networkConfigurationsByChainId: Record<`0x${string}`, NetworkConfiguration>,
) => {
  const hexDestChainId = step.destChainId
    ? decimalToPrefixedHex(step.destChainId)
    : undefined;
  const destNetworkConfiguration = hexDestChainId
    ? networkConfigurationsByChainId[hexDestChainId as Hex]
    : undefined;

  const destChainName =
    NETWORK_TO_SHORT_NETWORK_NAME_MAP[
      destNetworkConfiguration?.chainId as AllowedBridgeChainIds
    ];

  const destSymbol = step.destAsset?.symbol;

  if (!destSymbol) {
    return null;
  }

  return stepStatus === StatusTypes.COMPLETE
    ? strings('bridge_transaction_details.bridge_step_action_bridge_complete', { destSymbol, destChainName })
    : strings('bridge_transaction_details.bridge_step_action_bridge_pending', { destSymbol, destChainName });
};

const getBridgeActionStatus = (bridgeHistoryItem: BridgeHistoryItem) => bridgeHistoryItem.status ? bridgeHistoryItem.status.status : null;

/**
 * swap actions can have step.srcChainId === step.destChainId, and can occur on
 * EITHER the quote.srcChainId or the quote.destChainId
 * Despite not having any actual timestamp,we can infer the status of the swap action
 * based on the status of the source chain tx if srcChainId and destChainId are the same*
 *
 * @param bridgeHistoryItem
 * @param step
 * @param srcChainTxMeta
 */
const getSwapActionStatus = (
  bridgeHistoryItem: BridgeHistoryItem,
  step: Step,
  srcChainTxMeta?: TransactionMeta,
) => {
  const isSrcAndDestChainSame = step.srcChainId === step.destChainId;
  const isSwapOnSrcChain =
    step.srcChainId === bridgeHistoryItem.quote.srcChainId;

  if (isSrcAndDestChainSame && isSwapOnSrcChain) {
    // if the swap action is on the src chain (i.e. step.srcChainId === step.destChainId === bridgeHistoryItem.quote.srcChainId),
    // we check the source chain tx status, since we know when it's confirmed
    const isSrcChainTxConfirmed =
      srcChainTxMeta?.status === TransactionStatus.confirmed;
    return isSrcChainTxConfirmed ? StatusTypes.COMPLETE : StatusTypes.PENDING;
  }
  // if the swap action is on the dest chain, we check the bridgeHistoryItem.status,
  // since we don't know when the dest tx is confirmed
  if (srcChainTxMeta?.status === TransactionStatus.confirmed) {
    return bridgeHistoryItem.status ? bridgeHistoryItem.status.status : null;
  }

  // If the source chain tx is not confirmed, we know the swap hasn't started
  // use null to represent this as we don't have an equivalent in StatusTypes
  return null;
};

const getSwapActionText = (
  status: StatusTypes | null,
  step: Step,
) => {
  const srcSymbol = step.srcAsset?.symbol;
  const destSymbol = step.destAsset?.symbol;

  if (!srcSymbol || !destSymbol) {
    return null;
  }

  return status === StatusTypes.COMPLETE
    ? strings('bridge_transaction_details.bridge_step_action_swap_complete', { srcSymbol, destSymbol })
    : strings('bridge_transaction_details.bridge_step_action_swap_pending', { srcSymbol, destSymbol });
};

export const getStepStatus = ({
  bridgeHistoryItem,
  step,
  srcChainTxMeta,
}: {
  bridgeHistoryItem?: BridgeHistoryItem;
  step: Step;
  srcChainTxMeta?: TransactionMeta;
}) => {
  if (!bridgeHistoryItem) {
    return StatusTypes.UNKNOWN;
  }

  if (step.action === ActionTypes.SWAP) {
    return getSwapActionStatus(bridgeHistoryItem, step, srcChainTxMeta);
  } else if (step.action === ActionTypes.BRIDGE) {
    return getBridgeActionStatus(bridgeHistoryItem);
  }

  return StatusTypes.UNKNOWN;
};

const styles = StyleSheet.create({
  stepDescription: {
    marginLeft: 8,
  },
});

interface BridgeStepProps {
  step: Step;
  networkConfigurationsByChainId: Record<`0x${string}`, NetworkConfiguration>;
  time?: string;
  stepStatus: StatusTypes | null;
}

// You can have the following cases:
// 1. Bridge: usually for cases like Optimism ETH to Arbitrum ETH
// 2. Swap > Bridge
// 3. Swap > Bridge > Swap: e.g. Optimism ETH to Avalanche USDC
export default function BridgeStepDescription({
  step,
  networkConfigurationsByChainId,
  time,
  stepStatus,
}: BridgeStepProps) {
  return (
    <Box
      alignItems={AlignItems.center}
      flexDirection={FlexDirection.Row}
      gap={2}
      style={styles.stepDescription}
    >
      <Text
        color={
          stepStatus === StatusTypes.PENDING ||
          stepStatus === StatusTypes.COMPLETE
            ? TextColor.Default
            : TextColor.Alternative
        }
        variant={
          stepStatus === StatusTypes.PENDING
            ? TextVariant.BodyMDMedium
            : TextVariant.BodyMD
        }
      >
        {time && `${time} `}
        {step.action === ActionTypes.BRIDGE &&
          getBridgeActionText(
            stepStatus,
            step,
            networkConfigurationsByChainId,
          )}
        {step.action === ActionTypes.SWAP &&
          getSwapActionText(stepStatus, step)}
      </Text>
    </Box>
  );
}
