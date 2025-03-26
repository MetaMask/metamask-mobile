import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Box } from '../../../Box/Box';
import { useStyles } from '../../../../../component-library/hooks';
import {
  selectEnabledSourceChains,
  selectSelectedSourceChainIds,
  setSelectedSourceChainIds
} from '../../../../../core/redux/slices/bridge';
import { strings } from '../../../../../../locales/i18n';
import { useGetFormattedTokensPerChain } from '../../../../hooks/useGetFormattedTokensPerChain';
import { useGetTotalFiatBalanceCrossChains } from '../../../../hooks/useGetTotalFiatBalanceCrossChains';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { addCurrencySymbol, renderNumber } from '../../../../../util/number';
import Button, { ButtonVariants, ButtonWidthTypes } from '../../../../../component-library/components/Buttons/Button';
import Checkbox from '../../../../../component-library/components/Checkbox/Checkbox';
import ListItem from '../../../../../component-library/components/List/ListItem/ListItem';
import { VerticalAlignment } from '../../../../../component-library/components/List/ListItem/ListItem.types';
import { useSortedSourceNetworks } from '../../hooks/useSortedSourceNetworks';
import { BridgeNetworkSelectorBase } from '../BridgeNetworkSelectorBase';
import { NetworkRow } from '../NetworkRow';
import Text, { TextVariant } from '../../../../../component-library/components/Texts/Text';
import { BridgeSourceNetworkSelectorSelectorsIDs } from '../../../../../../e2e/selectors/Bridge/BridgeSourceNetworkSelector.selectors';

const createStyles = () => StyleSheet.create({
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

export const BridgeSourceNetworkSelector: React.FC = () => {
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const enabledSourceChains = useSelector(selectEnabledSourceChains);
  const enabledSourceChainIds = useMemo(
    () => enabledSourceChains.map((chain) => chain.chainId), [enabledSourceChains]
  );
  const selectedSourceChainIds = useSelector(selectSelectedSourceChainIds);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  const { sortedSourceNetworks } = useSortedSourceNetworks();

  // Local state for candidate network selections
  const [candidateSourceChainIds, setCandidateSourceChainIds] = useState<string[]>(selectedSourceChainIds);

  const formattedTokensWithBalancesPerChain = useGetFormattedTokensPerChain(
    [selectedInternalAccount as InternalAccount],
    true,
    enabledSourceChainIds,
  );
  const totalFiatBalancesCrossChain = useGetTotalFiatBalanceCrossChains(
    [selectedInternalAccount as InternalAccount],
    formattedTokensWithBalancesPerChain,
  );

  const address = selectedInternalAccount?.address;

  const handleApply = useCallback(() => {
    // Update the Redux state with the candidate selections
    dispatch(setSelectedSourceChainIds(candidateSourceChainIds));
    // Return to previous screen with selected networks
    navigation.goBack();
  }, [navigation, dispatch, candidateSourceChainIds]);

  // Toggle chain selection
  const toggleChain = useCallback((chainId: string) => {
    if (candidateSourceChainIds.includes(chainId)) {
      // Remove chain if already selected
      setCandidateSourceChainIds(candidateSourceChainIds.filter(id => id !== chainId));
    } else {
      // Add chain if not already selected
      setCandidateSourceChainIds([...candidateSourceChainIds, chainId]);
    }
  }, [candidateSourceChainIds]);

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

  // Calculate total fiat value per chain (native + tokens)
  const getChainTotalFiatValue = useCallback((chainId: string) => {
    if (!address || !totalFiatBalancesCrossChain[address]) return 0;

    const chainData = totalFiatBalancesCrossChain[address].tokenFiatBalancesCrossChains.find(
      (chain) => chain.chainId === chainId
    );

    if (!chainData) return 0;

    // Sum native value and all token values
    const tokenFiatSum = chainData.tokenFiatBalances.reduce((sum, value) => sum + value, 0);
    return chainData.nativeFiatValue + tokenFiatSum;
  }, [address, totalFiatBalancesCrossChain]);

  // Format currency value using the user's chosen currency
  const formatFiatValue = useCallback((value: number) =>
     addCurrencySymbol(renderNumber(value.toString()), currentCurrency)
  , [currentCurrency]);

  const areAllNetworksSelected = useMemo(() =>
    candidateSourceChainIds.length === enabledSourceChainIds.length,
  [candidateSourceChainIds, enabledSourceChainIds]);

  const renderSourceNetworks = useCallback(() => (
    sortedSourceNetworks.map((chain) => {
      const totalFiatValue = getChainTotalFiatValue(chain.chainId);
      const isSelected = candidateSourceChainIds.includes(chain.chainId);

      return (
        <TouchableOpacity
          key={chain.chainId}
          onPress={() => toggleChain(chain.chainId)}
          testID={`chain-${chain.chainId}`}
        >
          <ListItem
            verticalAlignment={VerticalAlignment.Center}
          >
            <Checkbox
              isChecked={isSelected}
              onPress={() => toggleChain(chain.chainId)}
              testID={`checkbox-${chain.chainId}`}
            />
              <NetworkRow
                chainId={chain.chainId}
                chainName={chain.name}
              >
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
    })
  ), [candidateSourceChainIds, formatFiatValue, getChainTotalFiatValue, styles, toggleChain, sortedSourceNetworks]);

  return (
    <BridgeNetworkSelectorBase>
      <Box style={styles.selectAllContainer}>
        <Button
          label={areAllNetworksSelected ? strings('bridge.deselect_all_networks') : strings('bridge.select_all_networks')}
          onPress={toggleAllChains}
          testID={BridgeSourceNetworkSelectorSelectorsIDs.SELECT_ALL_NETWORKS_BUTTON}
          variant={ButtonVariants.Link}
        />
      </Box>

      <Box style={styles.listContent}>
        {renderSourceNetworks()}
      </Box>

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
