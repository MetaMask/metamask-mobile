import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';
import { useCardSDK } from '../../sdk';
import {
  AllowanceState,
  CardExternalWalletDetail,
  CardTokenAllowance,
} from '../../types';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectIsAuthenticatedCard,
  setAuthenticatedPriorityToken,
  setAuthenticatedPriorityTokenLastFetched,
} from '../../../../../core/redux/slices/card';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../constants/navigation/Routes';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { buildTokenIconUrl } from '../../util/buildTokenIconUrl';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import { CaipChainId } from '@metamask/utils';
import useGetDelegationSettings from '../../hooks/useGetDelegationSettings';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { FlatList } from 'react-native-gesture-handler';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import { SolScope } from '@metamask/keyring-api';
import useGetCardExternalWalletDetails from '../../hooks/useGetCardExternalWalletDetails';
import Logger from '../../../../../util/Logger';
import { safeFormatChainIdToHex } from '../../util/safeFormatChainIdToHex';

interface SupportedTokenWithChain {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  enabled: boolean;
  caipChainId: CaipChainId;
  chainName: string;
  balance?: string;
  balanceFiat?: string;
  image?: string;
  logo?: string;
  allowanceState: AllowanceState;
  allowance?: string;
}

export interface AssetSelectionBottomSheetProps {
  setOpenAssetSelectionBottomSheet: (open: boolean) => void;
  sheetRef: React.RefObject<BottomSheetRef>;
  priorityToken: CardTokenAllowance | null;
  tokensWithAllowances: CardTokenAllowance[];
  navigateToCardHomeOnPriorityToken?: boolean;
}

const AssetSelectionBottomSheet: React.FC<AssetSelectionBottomSheetProps> = ({
  setOpenAssetSelectionBottomSheet,
  sheetRef,
  priorityToken,
  tokensWithAllowances,
  navigateToCardHomeOnPriorityToken = false,
}) => {
  const navigation = useNavigation();
  const theme = useTheme();
  const tw = useTailwind();
  const dispatch = useDispatch();
  const { sdk } = useCardSDK();
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);
  const {
    data: delegationSettingsData,
    isLoading: isLoadingDelegationSettings,
  } = useGetDelegationSettings();
  const { data: cardExternalWalletDetails } = useGetCardExternalWalletDetails();

  const [supportedTokens, setSupportedTokens] = useState<
    SupportedTokenWithChain[]
  >([]);

  // Map tokens with allowances to display format
  const mapTokensForDisplay = useCallback(() => {
    if (!tokensWithAllowances || tokensWithAllowances.length === 0) {
      return [];
    }

    return tokensWithAllowances.map((token) => {
      // Determine network name from chainId
      const isSolana = token.caipChainId === SolScope.Mainnet;
      // Build icon URL - use chainId directly (already in hex format)
      const iconUrl = buildTokenIconUrl(token.caipChainId, token.address || '');

      // Parse balance and allowance for display
      const balance = token.availableBalance
        ? parseFloat(token.availableBalance).toFixed(6)
        : '0';
      const balanceFloat = parseFloat(balance);

      // Simple USD conversion (in real app, you'd get actual price)
      // For now, just display balance as is
      const balanceFiat = `$${balanceFloat.toFixed(2)} USD`;

      return {
        address: token.address || '',
        symbol: token.symbol?.toUpperCase() || '',
        name: token.name || '',
        decimals: token.decimals || 0,
        enabled: token.allowanceState !== AllowanceState.NotEnabled,
        caipChainId: token.caipChainId,
        chainName: isSolana ? 'Solana' : 'Linea',
        balance,
        balanceFiat,
        image: iconUrl,
        logo: iconUrl,
        allowanceState: token.allowanceState,
        allowance: token.allowance || '0',
      };
    });
  }, [tokensWithAllowances]);

  // Update supported tokens when tokensWithAllowances changes
  useEffect(() => {
    const mappedTokens = mapTokensForDisplay();
    setSupportedTokens(mappedTokens);
  }, [mapTokensForDisplay]);

  const closeBottomSheetAndNavigate = useCallback(
    (navigateFunc: () => void) => {
      sheetRef.current?.onCloseBottomSheet(navigateFunc);
    },
    [sheetRef],
  );

  const updatePriority = useCallback(
    async (token: SupportedTokenWithChain) => {
      if (!sdk || !delegationSettingsData) {
        setOpenAssetSelectionBottomSheet(false);
        return;
      }

      Logger.log('token', JSON.stringify(token));

      try {
        // Get current wallet details with delegation settings
        const selectedWallet = cardExternalWalletDetails?.walletDetails.find(
          (wallet) =>
            wallet.tokenDetails.address?.toLowerCase() ===
              token.address?.toLowerCase() &&
            wallet.caipChainId === token.caipChainId,
        );
        Logger.log('selectedWallet', selectedWallet);
        if (selectedWallet && cardExternalWalletDetails?.walletDetails) {
          // Create new priority order: selected token becomes priority 1, others shift down
          const newPriorities = cardExternalWalletDetails?.walletDetails.map(
            (wallet: CardExternalWalletDetail, index: number) => ({
              id: wallet.id,
              priority: wallet.id === selectedWallet.id ? 1 : index + 2,
            }),
          );

          if (newPriorities) {
            try {
              await sdk.updateWalletPriority(newPriorities);
            } catch (error) {
              Logger.log('Error updating wallet priority:', error);
            }
          }

          // Set the selected token as the priority token in Redux
          const newPriorityTokenWalletDetail =
            cardExternalWalletDetails?.walletDetails.find(
              (wallet) =>
                wallet.tokenDetails.address?.toLowerCase() ===
                  token.address?.toLowerCase() &&
                wallet.caipChainId === token.caipChainId,
            );

          const priorityTokenData = {
            address: token.address,
            decimals: token.decimals,
            symbol: token.symbol,
            name: token.name,
            allowanceState: AllowanceState.Enabled,
            allowance: token.allowance || '0',
            availableBalance: token.balance || '0',
            walletAddress: newPriorityTokenWalletDetail?.walletAddress || '',
            caipChainId: token.caipChainId,
            isStaked: false,
          };

          dispatch(setAuthenticatedPriorityToken(priorityTokenData));
          dispatch(setAuthenticatedPriorityTokenLastFetched(new Date()));
        }

        setOpenAssetSelectionBottomSheet(false);
      } catch (error) {
        console.error('Error updating wallet priority:', error);
        setOpenAssetSelectionBottomSheet(false);
      }
    },
    [
      sdk,
      delegationSettingsData,
      setOpenAssetSelectionBottomSheet,
      cardExternalWalletDetails,
      dispatch,
    ],
  );

  const handleTokenPress = useCallback(
    async (token: SupportedTokenWithChain) => {
      // Check if this token is already the priority token
      const isAlreadyPriorityToken =
        priorityToken &&
        priorityToken.address?.toLowerCase() === token.address?.toLowerCase() &&
        priorityToken.caipChainId === token.caipChainId;

      if (isAlreadyPriorityToken) {
        // Token is already the priority token
        if (navigateToCardHomeOnPriorityToken) {
          // Navigate back to CardHome and close bottom sheet
          closeBottomSheetAndNavigate(() => {
            navigation.navigate(Routes.CARD.HOME);
          });
        } else {
          // Just close the bottom sheet
          setOpenAssetSelectionBottomSheet(false);
        }
      } else if (token.enabled && isAuthenticated) {
        // Token is already delegated, update priority directly
        await updatePriority(token);
      } else {
        // Token is not delegated, navigate to Change Asset screen to delegate it
        closeBottomSheetAndNavigate(() => {
          navigation.navigate(Routes.CARD.CHANGE_ASSET, {
            selectedToken: token,
            priorityToken,
          });
        });
      }
    },
    [
      priorityToken,
      isAuthenticated,
      navigateToCardHomeOnPriorityToken,
      closeBottomSheetAndNavigate,
      navigation,
      setOpenAssetSelectionBottomSheet,
      updatePriority,
    ],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={false}
      onClose={() => {
        setOpenAssetSelectionBottomSheet(false);
      }}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader
        onClose={() => setOpenAssetSelectionBottomSheet(false)}
      >
        <Text variant={TextVariant.HeadingSM}>
          {strings('card.select_asset')}
        </Text>
      </BottomSheetHeader>

      {isLoadingDelegationSettings ? (
        // Loading delegation settings
        <View style={tw.style('items-center justify-center py-8')}>
          <ActivityIndicator
            size="large"
            color={theme.colors.primary.default}
          />
        </View>
      ) : supportedTokens.length > 0 ? (
        <FlatList
          scrollEnabled
          data={supportedTokens}
          renderItem={({ item }) => (
            <ListItemSelect onPress={() => handleTokenPress(item)}>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
                twClassName="flex-1"
              >
                {/* Token Info */}
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="flex-1"
                >
                  <BadgeWrapper
                    style={tw.style('mr-3')}
                    badgePosition={BadgePosition.BottomRight}
                    badgeElement={
                      item.caipChainId ? (
                        <Badge
                          variant={BadgeVariant.Network}
                          imageSource={NetworkBadgeSource(
                            safeFormatChainIdToHex(
                              item.caipChainId,
                            ) as `0x${string}`,
                          )}
                        />
                      ) : null
                    }
                  >
                    <AvatarToken
                      size={AvatarSize.Md}
                      imageSource={{ uri: item.image || item.logo }}
                    />
                  </BadgeWrapper>
                  <Box
                    twClassName="flex-1"
                    justifyContent={BoxJustifyContent.Center}
                  >
                    <Text
                      variant={TextVariant.BodyMD}
                      style={tw.style('font-semibold')}
                    >
                      {item.symbol} on {item.chainName}
                    </Text>
                    <Text
                      variant={TextVariant.BodySM}
                      style={tw.style('font-medium text-text-alternative')}
                    >
                      {item.allowanceState === AllowanceState.Enabled
                        ? 'Enabled'
                        : item.allowanceState === AllowanceState.Limited
                        ? 'Limited'
                        : 'Not enabled'}
                    </Text>
                  </Box>
                </Box>

                {/* Balance */}
                <Box twClassName="items-end">
                  <Text
                    variant={TextVariant.BodySM}
                    style={tw.style('text-text-default font-medium')}
                  >
                    {item.balanceFiat}
                  </Text>
                  <Text
                    variant={TextVariant.BodyXS}
                    style={tw.style('text-text-alternative mt-1')}
                  >
                    {item.balance} {item.symbol}
                  </Text>
                </Box>
              </Box>
            </ListItemSelect>
          )}
          keyExtractor={(item) =>
            `${item.address}-${item.symbol}-${safeFormatChainIdToHex(
              item.caipChainId,
            )}`
          }
        />
      ) : (
        <View style={tw.style('items-center justify-center py-8')}>
          <Text
            variant={TextVariant.BodySM}
            style={tw.style('text-center text-text-alternative')}
          >
            No tokens available
          </Text>
        </View>
      )}
    </BottomSheet>
  );
};

export default AssetSelectionBottomSheet;
