import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Box } from '../../../Box/Box';
import { useStyles } from '../../../../../component-library/hooks';
import {
  selectEnabledSourceChains,
  selectSelectedSourceChainIds,
  setSelectedSourceChainIds,
  setSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { strings } from '../../../../../../locales/i18n';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { addCurrencySymbol, renderNumber } from '../../../../../util/number';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Checkbox from '../../../../../component-library/components/Checkbox/Checkbox';
import ListItem from '../../../../../component-library/components/List/ListItem/ListItem';
import { VerticalAlignment } from '../../../../../component-library/components/List/ListItem/ListItem.types';
import { useSortedSourceNetworks } from '../../hooks/useSortedSourceNetworks';
import { BridgeNetworkSelectorBase } from '../BridgeNetworkSelectorBase';
import { NetworkRow } from '../NetworkRow';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { BridgeSourceNetworkSelectorSelectorsIDs } from '../../../../../../e2e/selectors/Bridge/BridgeSourceNetworkSelector.selectors';
import { useNetworkInfo } from '../../../../../selectors/selectedNetworkController';
import { useSwitchNetworks } from '../../../../Views/NetworkSelector/useSwitchNetworks';
import { CaipChainId, Hex } from '@metamask/utils';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';

const createStyles = () =>
  StyleSheet.create({
    listContent: {
      padding: 8,
    },
    fiatValue: {
      textAlign: 'right',
      flex: 1,
    },
    selectAllContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    applyButtonContainer: {
      padding: 16,
      marginTop: 'auto',
    },
  });

export interface BridgeSourceNetworkSelectorProps {
  chainIds?: Hex[];
  onApply?: (selectedChainIds: Hex[]) => void;
}

export const BridgeSourceNetworkSelector: React.FC<
  BridgeSourceNetworkSelectorProps
> = ({ chainIds, onApply }) => {
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const enabledSourceChains = useSelector(selectEnabledSourceChains);
  const selectedSourceChainIds = useSelector(selectSelectedSourceChainIds);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const { sortedSourceNetworks: sortedSourceNetworksRaw } =
    useSortedSourceNetworks();

  const enabledSourceChainIds = useMemo(
    () => enabledSourceChains.map((chain) => chain.chainId),
    [enabledSourceChains],
  );

  const sortedSourceNetworks = useMemo(
    () =>
      sortedSourceNetworksRaw.filter(
        (chain) =>
          enabledSourceChainIds.includes(chain.chainId) &&
          (!chainIds || chainIds.includes(chain.chainId as Hex)),
      ),
    [chainIds, enabledSourceChainIds, sortedSourceNetworksRaw],
  );

  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  // Local state for candidate network selections
  const [candidateSourceChainIds, setCandidateSourceChainIds] = useState<
    string[]
  >(selectedSourceChainIds);

  const {
    chainId: selectedEvmChainId,
    domainIsConnectedDapp,
    networkName: selectedNetworkName,
  } = useNetworkInfo();
  const {
    onSetRpcTarget,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    onNonEvmNetworkChange,
    ///: END:ONLY_INCLUDE_IF
  } = useSwitchNetworks({
    domainIsConnectedDapp,
    selectedChainId: selectedEvmChainId,
    selectedNetworkName,
  });

  const handleApply = useCallback(async () => {
    const newSelectedSourceChainids = candidateSourceChainIds.filter((id) =>
      enabledSourceChainIds.includes(id as CaipChainId),
    );

    if (onApply) {
      onApply(newSelectedSourceChainids as Hex[]);
      return;
    }

    // Update the Redux state with the candidate selections
    dispatch(
      setSelectedSourceChainIds(
        newSelectedSourceChainids as (Hex | CaipChainId)[],
      ),
    );

    // If there's only 1 network selected, set the source token to native token of that chain and switch chains
    if (newSelectedSourceChainids.length === 1) {
      const evmNetworkConfiguration =
        evmNetworkConfigurations[newSelectedSourceChainids[0] as Hex];
      if (evmNetworkConfiguration) {
        await onSetRpcTarget(evmNetworkConfiguration);
      }

      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      if (!evmNetworkConfiguration) {
        await onNonEvmNetworkChange(
          newSelectedSourceChainids[0] as CaipChainId,
        );
      }
      ///: END:ONLY_INCLUDE_IF

      // Reset the source token, if undefined will be the native token of the selected chain
      dispatch(setSourceToken(undefined));
    }

    // Return to previous screen with selected networks
    navigation.goBack();
  }, [
    navigation,
    dispatch,
    candidateSourceChainIds,
    enabledSourceChainIds,
    evmNetworkConfigurations,
    onSetRpcTarget,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    onNonEvmNetworkChange,
    ///: END:ONLY_INCLUDE_IF
    onApply,
  ]);

  // Toggle chain selection
  const toggleChain = useCallback(
    (chainId: string) => {
      if (candidateSourceChainIds.includes(chainId)) {
        // Remove chain if already selected
        setCandidateSourceChainIds(
          candidateSourceChainIds.filter((id) => id !== chainId),
        );
      } else {
        // Add chain if not already selected
        setCandidateSourceChainIds([...candidateSourceChainIds, chainId]);
      }
    },
    [candidateSourceChainIds],
  );

  // Select or deselect all networks
  const toggleAllChains = useCallback(() => {
    if (candidateSourceChainIds.length === enabledSourceChainIds.length) {
      // If all are selected, deselect all
      setCandidateSourceChainIds([]);
    } else {
      // Otherwise select all
      setCandidateSourceChainIds([...enabledSourceChainIds]);
    }
  }, [candidateSourceChainIds, enabledSourceChainIds]);

  // Format currency value using the user's chosen currency
  const formatFiatValue = useCallback(
    (value: number) =>
      addCurrencySymbol(renderNumber(value.toString()), currentCurrency),
    [currentCurrency],
  );

  const areAllNetworksSelected = useMemo(
    () => candidateSourceChainIds.length === enabledSourceChainIds.length,
    [candidateSourceChainIds, enabledSourceChainIds],
  );

  const renderSourceNetworks = useCallback(
    () =>
      sortedSourceNetworks.map((chain) => {
        const totalFiatValue = chain.totalFiatValue;
        const isSelected = candidateSourceChainIds.includes(chain.chainId);

        return (
          <TouchableOpacity
            key={chain.chainId}
            onPress={() => toggleChain(chain.chainId)}
            testID={`chain-${chain.chainId}`}
          >
            <ListItem verticalAlignment={VerticalAlignment.Center}>
              <Checkbox
                isChecked={isSelected}
                onPress={() => toggleChain(chain.chainId)}
                testID={`checkbox-${chain.chainId}`}
              />
              <NetworkRow chainId={chain.chainId} chainName={chain.name}>
                <Text
                  style={styles.fiatValue}
                  variant={TextVariant.BodyLGMedium}
                >
                  {formatFiatValue(totalFiatValue)}
                </Text>
              </NetworkRow>
            </ListItem>
          </TouchableOpacity>
        );
      }),
    [
      candidateSourceChainIds,
      formatFiatValue,
      styles,
      toggleChain,
      sortedSourceNetworks,
    ],
  );

  return (
    <BridgeNetworkSelectorBase>
      <Box style={styles.selectAllContainer}>
        <Button
          label={
            areAllNetworksSelected
              ? strings('bridge.deselect_all_networks')
              : strings('bridge.select_all_networks')
          }
          onPress={toggleAllChains}
          testID={
            BridgeSourceNetworkSelectorSelectorsIDs.SELECT_ALL_NETWORKS_BUTTON
          }
          variant={ButtonVariants.Link}
        />
      </Box>

      <Box style={styles.listContent}>{renderSourceNetworks()}</Box>

      <Box style={styles.applyButtonContainer}>
        <Button
          label={strings('bridge.apply')}
          onPress={handleApply}
          variant={ButtonVariants.Secondary}
          disabled={candidateSourceChainIds.length === 0}
          width={ButtonWidthTypes.Full}
          testID={BridgeSourceNetworkSelectorSelectorsIDs.APPLY_BUTTON}
        />
      </Box>
    </BridgeNetworkSelectorBase>
  );
};
