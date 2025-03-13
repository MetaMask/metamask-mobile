import React, { useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Box } from '../Box/Box';
import Text, { TextVariant } from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';
import { selectEnabledSourceChains } from '../../../core/redux/slices/bridge';
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
      padding: 16,
    },
    networkItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
    },
    networkIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      marginRight: 12,
    },
    networkInfo: {
      flex: 1,
    },
    networkName: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text.default,
    },
    fiatValue: {
      fontSize: 14,
      color: theme.colors.text.alternative,
      marginTop: 4,
    },
  });
};

export const BridgeNetworkSelector: React.FC = () => {
  const { styles, theme } = useStyles(createStyles, {});
  const navigation = useNavigation();
  const enabledSourceChains = useSelector(selectEnabledSourceChains);
  const enabledSourceChainIds = enabledSourceChains.map((chain) => chain.chainId);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
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

  const handleNetworkSelect = useCallback((_chainId: string) => {
    // TODO: Implement network selection logic
    navigation.goBack();
  }, [navigation]);

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

  // Sort networks by total fiat value in descending order
  const sortedNetworks = useMemo(() =>
    [...enabledSourceChains].sort((a, b) => {
      const valueA = getChainTotalFiatValue(a.chainId);
      const valueB = getChainTotalFiatValue(b.chainId);
      return valueB - valueA; // Descending order
    })
  , [enabledSourceChains, getChainTotalFiatValue]);

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

        <Box style={styles.listContent}>
          {sortedNetworks.map((chain) => {
            const totalFiatValue = getChainTotalFiatValue(chain.chainId);
            // @ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
            const networkImage = getNetworkImageSource({ chainId: chain.chainId });

            return (
              <TouchableOpacity
                key={chain.chainId}
                style={styles.networkItem}
                onPress={() => handleNetworkSelect(chain.chainId)}
                testID={`network-selector-${chain.chainId}`}
              >
                <Image source={networkImage} style={styles.networkIcon} />
                <Box style={styles.networkInfo}>
                  <Text style={styles.networkName}>{chain.name}</Text>
                  <Text style={styles.fiatValue}>{formatFiatValue(totalFiatValue)}</Text>
                </Box>
              </TouchableOpacity>
            );
          })}
        </Box>
      </Box>
    </BottomSheet>
  );
};
