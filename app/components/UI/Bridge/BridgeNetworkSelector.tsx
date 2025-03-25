import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Box } from '../Box/Box';
import Text, { TextVariant } from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';
import {
  selectEnabledSourceChains,
  selectSelectedSourceChainIds,
  setSelectedSourceChainIds
} from '../../../core/redux/slices/bridge';
import { getNetworkImageSource } from '../../../util/networks';
import Icon, { IconName } from '../../../component-library/components/Icons/Icon';
import { IconSize } from '../../../component-library/components/Icons/Icon/Icon.types';
import { strings } from '../../../../locales/i18n';
import { FlexDirection, AlignItems, JustifyContent } from '../Box/box.types';
import { useGetFormattedTokensPerChain } from '../../hooks/useGetFormattedTokensPerChain';
import { useGetTotalFiatBalanceCrossChains } from '../../hooks/useGetTotalFiatBalanceCrossChains';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { addCurrencySymbol, renderNumber } from '../../../util/number';
import Button, { ButtonVariants, ButtonWidthTypes } from '../../../component-library/components/Buttons/Button';
import Checkbox from '../../../component-library/components/Checkbox/Checkbox';
import ListItem from '../../../component-library/components/List/ListItem/ListItem';
import { VerticalAlignment } from '../../../component-library/components/List/ListItem/ListItem.types';
import { useSortedSourceNetworks } from './useSortedSourceNetworks';
const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    content: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      position: 'absolute',
      right: 0,
    },
    closeIconBox: {
      padding: 8,
    },
    listContent: {
      padding: 8,
    },
    networkIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    networkName: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text.default,
    },
    fiatValue: {
      textAlign: 'right',
    },
    selectAllContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    applyButtonContainer: {
      padding: 16,
      marginTop: 'auto',
    },
    chainName: {
      flex: 1,
    },
  });
};

export const BridgeNetworkSelector: React.FC = () => {
  const { styles, theme } = useStyles(createStyles, {});
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const enabledSourceChains = useSelector(selectEnabledSourceChains);
  const enabledSourceChainIds = enabledSourceChains.map((chain) => chain.chainId);
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

  return (
    <BottomSheet isFullscreen>
      <Box style={styles.content}>
        <Box gap={4}>
          <BottomSheetHeader>
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              justifyContent={JustifyContent.center}
            >
              <Text variant={TextVariant.HeadingMD} style={styles.headerTitle}>
                {strings('bridge.select_network')}
              </Text>
              <Box style={[styles.closeButton, styles.closeIconBox]}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  testID="bridge-network-selector-close-button"
                >
                  <Icon
                    name={IconName.Close}
                    size={IconSize.Sm}
                    color={theme.colors.icon.default}
                  />
                </TouchableOpacity>
              </Box>
            </Box>
          </BottomSheetHeader>
        </Box>

        <Box style={styles.selectAllContainer}>
          <Button
            label={areAllNetworksSelected ? strings('bridge.deselect_all_networks') : strings('bridge.select_all_networks')}
            onPress={toggleAllChains}
            testID="select-all-networks-button"
            variant={ButtonVariants.Link}
          />
        </Box>

        <Box style={styles.listContent}>
          {sortedSourceNetworks.map((chain) => {
            const totalFiatValue = getChainTotalFiatValue(chain.chainId);
            // @ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
            const networkImage = getNetworkImageSource({ chainId: chain.chainId });
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
                  <Image source={networkImage} style={styles.networkIcon} />
                  <Box style={styles.chainName}>
                    <Text style={styles.networkName}>{chain.name}</Text>
                  </Box>
                  <Text style={styles.fiatValue} variant={TextVariant.BodyLGMedium}>{formatFiatValue(totalFiatValue)}</Text>
                </ListItem>
              </TouchableOpacity>
            );
          })}
        </Box>

        <Box style={styles.applyButtonContainer}>
          <Button
            label={strings('bridge.apply')}
            onPress={handleApply}
            testID="bridge-network-selector-apply-button"
            variant={ButtonVariants.Secondary}
            disabled={candidateSourceChainIds.length === 0}
            width={ButtonWidthTypes.Full}
          />
        </Box>
      </Box>
    </BottomSheet>
  );
};
