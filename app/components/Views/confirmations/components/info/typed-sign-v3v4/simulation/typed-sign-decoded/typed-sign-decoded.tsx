import React, { useMemo } from 'react';
import { View } from 'react-native';
import {
  DecodingDataChangeType,
  DecodingDataStateChange,
  DecodingDataStateChanges,
} from '@metamask/signature-controller';
import { Hex } from '@metamask/utils';

import { TokenStandard } from '../../../../../../../UI/SimulationDetails/types';
import Text from '../../../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../../../locales/i18n';
import { useSignatureRequest } from '../../../../../hooks/signatures/useSignatureRequest';
import InfoRow from '../../../../UI/info-row';
import NativeValueDisplay from '../components/native-value-display';
import SimulationValueDisplay from '../components/value-display';
import StaticSimulation from '../static';

const styles = {
  unavailableContainer: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
};

export enum StateChangeType {
  NFTListingReceive = 'NFTListingReceive',
  NFTBiddingReceive = 'NFTBiddingReceive',
}

export const getStateChangeType = (
  stateChangeList: DecodingDataStateChanges | null,
  stateChange: DecodingDataStateChange,
): StateChangeType | undefined => {
  if (stateChange.changeType === DecodingDataChangeType.Receive) {
    if (
      stateChangeList?.some(
        (change) =>
          change.changeType === DecodingDataChangeType.Listing &&
          change.assetType === TokenStandard.ERC721,
      )
    ) {
      return StateChangeType.NFTListingReceive;
    }
    if (
      stateChange.assetType === TokenStandard.ERC721 &&
      stateChangeList?.some(
        (change) => change.changeType === DecodingDataChangeType.Bidding,
      )
    ) {
      return StateChangeType.NFTBiddingReceive;
    }
  }
  return undefined;
};

export const getStateChangeToolip = (
  nftTransactionType: StateChangeType | undefined,
): string | undefined => {
  if (nftTransactionType === StateChangeType.NFTListingReceive) {
    return strings('confirm.simulation.decoded_tooltip_list_nft');
  } else if (nftTransactionType === StateChangeType.NFTBiddingReceive) {
    return strings('confirm.simulation.decoded_tooltip_bid_nft');
  }
  return undefined;
};

const stateChangeOrder = {
  [DecodingDataChangeType.Transfer]: 1,
  [DecodingDataChangeType.Listing]: 2,
  [DecodingDataChangeType.Approve]: 3,
  [DecodingDataChangeType.Revoke]: 4,
  [DecodingDataChangeType.Bidding]: 5,
  [DecodingDataChangeType.Receive]: 6,
};

const getStateChangeLabelMap = (
  changeType: string,
  stateChangeType?: StateChangeType,
) =>
  ({
    [DecodingDataChangeType.Transfer]: strings(
      'confirm.simulation.label_change_type_transfer',
    ),
    [DecodingDataChangeType.Receive]:
      stateChangeType === StateChangeType.NFTListingReceive
        ? strings('confirm.simulation.label_change_type_nft_listing')
        : strings('confirm.simulation.label_change_type_receive'),
    [DecodingDataChangeType.Approve]: strings(
      'confirm.simulation.label_change_type_permit',
    ),
    [DecodingDataChangeType.Revoke]: strings(
      'confirm.simulation.label_change_type_revoke',
    ),
    [DecodingDataChangeType.Bidding]: strings(
      'confirm.simulation.label_change_type_bidding',
    ),
    [DecodingDataChangeType.Listing]: strings(
      'confirm.simulation.label_change_type_listing',
    ),
  }[changeType]);

const StateChangeRow = ({
  stateChangeList,
  stateChange,
  chainId,
  shouldDisplayLabel,
}: {
  stateChangeList: DecodingDataStateChanges | null;
  stateChange: DecodingDataStateChange;
  chainId: Hex;
  shouldDisplayLabel: boolean;
}) => {
  const { assetType, changeType, amount, contractAddress, tokenID } =
    stateChange;
  const nftTransactionType = getStateChangeType(stateChangeList, stateChange);
  const tooltip = shouldDisplayLabel
    ? getStateChangeToolip(nftTransactionType)
    : undefined;

  const canDisplayValueAsUnlimited =
    assetType === TokenStandard.ERC20 &&
    (changeType === DecodingDataChangeType.Approve ||
      changeType === DecodingDataChangeType.Revoke);

  const labelChangeType = shouldDisplayLabel
    ? getStateChangeLabelMap(changeType, nftTransactionType)
    : '';

  return (
    <InfoRow label={labelChangeType} tooltip={tooltip}>
      {(assetType === TokenStandard.ERC20 ||
        assetType === TokenStandard.ERC721 ||
        assetType === TokenStandard.ERC1155) && (
        <SimulationValueDisplay
          modalHeaderText={changeType}
          tokenContract={contractAddress}
          allowed={amount}
          value={amount}
          chainId={chainId}
          tokenId={tokenID}
          credit={
            nftTransactionType !== StateChangeType.NFTListingReceive &&
            changeType === DecodingDataChangeType.Receive
          }
          debit={changeType === DecodingDataChangeType.Transfer}
          canDisplayValueAsUnlimited={canDisplayValueAsUnlimited}
        />
      )}
      {assetType === 'NATIVE' && (
        <NativeValueDisplay
          value={amount}
          chainId={chainId}
          credit={
            nftTransactionType !== StateChangeType.NFTListingReceive &&
            changeType === DecodingDataChangeType.Receive
          }
          debit={changeType === DecodingDataChangeType.Transfer}
          modalHeaderText={labelChangeType}
        />
      )}
    </InfoRow>
  );
};

const DecodedSimulation: React.FC<object> = () => {
  const signatureRequest = useSignatureRequest();

  const chainId = signatureRequest?.chainId as Hex;
  const { decodingLoading, decodingData } = signatureRequest ?? {};

  const stateChangeFragment = useMemo(() => {
    const orderedStateChanges = [...(decodingData?.stateChanges ?? [])].sort(
      (c1, c2) =>
        stateChangeOrder[c1.changeType] > stateChangeOrder[c2.changeType]
          ? 1
          : -1,
    );
    const stateChangesGrouped: Record<string, DecodingDataStateChange[]> = (
      orderedStateChanges ?? []
    ).reduce<Record<string, DecodingDataStateChange[]>>(
      (result, stateChange) => {
        result[stateChange.changeType] = [
          ...(result[stateChange.changeType] ?? []),
          stateChange,
        ];
        return result;
      },
      {},
    );

    return Object.entries(stateChangesGrouped).flatMap(([_, changeList]) =>
      changeList.map((change: DecodingDataStateChange, index: number) => (
        <StateChangeRow
          key={`${change.changeType}-${index}`}
          stateChangeList={decodingData?.stateChanges ?? []}
          stateChange={change}
          chainId={chainId}
          shouldDisplayLabel={index === 0}
        />
      )),
    );
  }, [chainId, decodingData?.stateChanges]);

  return (
    <StaticSimulation
      title={strings('confirm.simulation.title')}
      titleTooltip={strings('confirm.simulation.tooltip')}
      simulationElements={
        stateChangeFragment.length ? (
          stateChangeFragment
        ) : (
          <View style={styles.unavailableContainer}>
            <Text>{strings('confirm.simulation.unavailable')}</Text>
          </View>
        )
      }
      isLoading={decodingLoading}
      isCollapsed={decodingLoading || !stateChangeFragment.length}
    />
  );
};

export default DecodedSimulation;
