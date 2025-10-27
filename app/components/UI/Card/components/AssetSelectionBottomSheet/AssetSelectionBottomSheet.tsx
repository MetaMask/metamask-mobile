import React, {
  useCallback,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';
import { useCardSDK } from '../../sdk';
import { AllowanceState, CardTokenAllowance } from '../../types';
import { useDispatch, useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import {
  selectIsAuthenticatedCard,
  setAuthenticatedPriorityToken,
  setAuthenticatedPriorityTokenLastFetched,
} from '../../../../../core/redux/slices/card';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import { strings } from '../../../../../../locales/i18n';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import Routes from '../../../../../constants/navigation/Routes';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { buildTokenIconUrl } from '../../util/buildTokenIconUrl';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import { Hex } from '@metamask/utils';
import { BAANX_MAX_LIMIT } from '../../constants';
import createStyles from './AssetSelectionBottomSheet.styles';
import { RootState } from '../../../../../reducers';

interface SupportedTokenWithChain {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  enabled: boolean;
  chainId: string;
  chainName: string;
  balance?: string;
  balanceFiat?: string;
  image?: string;
  logo?: string;
  allowanceState: AllowanceState;
  allowance?: string;
}

interface AssetSelectionBottomSheetProps {
  onTokenSelect: (token: SupportedTokenWithChain) => void;
  onClose: () => void;
  navigateToCardHomeOnPriorityToken?: boolean;
  priorityToken?: CardTokenAllowance;
}

export interface AssetSelectionBottomSheetRef {
  open: () => void;
  close: () => void;
}

const AssetSelectionBottomSheet = forwardRef<
  AssetSelectionBottomSheetRef,
  AssetSelectionBottomSheetProps
>(
  (
    { onClose, navigateToCardHomeOnPriorityToken = false, priorityToken },
    ref,
  ) => {
    const navigation = useNavigation();
    const theme = useTheme();
    const tw = useTailwind();
    const styles = createStyles(theme);
    const dispatch = useDispatch();
    const { sdk } = useCardSDK();
    const selectedAccount = useSelector(selectSelectedInternalAccount);
    const isAuthenticated = useSelector(selectIsAuthenticatedCard);

    // Safely get selected address with error handling
    const selectedAccountByScope = useSelector((state: RootState) =>
      selectSelectedInternalAccountByScope(state)('eip155:0'),
    );
    const selectedAddress = selectedAccountByScope?.address;

    const [supportedTokens, setSupportedTokens] = useState<
      SupportedTokenWithChain[]
    >([]);
    const [isLoading, setIsLoading] = useState(false);

    // Removed animation values - using simple View instead

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      open: () => {
        // Open bottom sheet
      },
      close: () => {
        // Close bottom sheet
      },
    }));

    // Get supported tokens from chain config API
    const getSupportedTokens = useCallback(async () => {
      if (!sdk || !selectedAddress || !isAuthenticated) return;

      setIsLoading(true);
      try {
        // Get supported tokens from chain config API (source of truth)
        const supportedTokensList =
          await sdk.getSupportedTokensFromChainConfig();

        if (supportedTokensList.length === 0) {
          setSupportedTokens([]);
          return;
        }

        // Get external wallet details to check which tokens are already enabled
        const externalWalletDetails = await sdk.getCardExternalWalletDetails();

        // Map tokens with their status from external wallets
        const tokensWithStatus = supportedTokensList.map((token) => {
          // Check if this token exists in external wallets
          const externalWallet = externalWalletDetails.find(
            (wallet) =>
              wallet.currency?.toLowerCase() === token.symbol?.toLowerCase(),
          );

          // Check if this token is the priority token
          const isPriorityToken =
            priorityToken &&
            priorityToken.address?.toLowerCase() ===
              token.address?.toLowerCase() &&
            priorityToken.symbol?.toLowerCase() === token.symbol?.toLowerCase();

          // Convert CAIP chain ID to hex format for buildTokenIconUrl
          const decimalChainId = sdk.lineaChainId.replace('eip155:', '');
          const hexChainId = `0x${parseInt(decimalChainId).toString(16)}`;
          const iconUrl = buildTokenIconUrl(hexChainId, token.address || '');

          return {
            address: token.address || '',
            symbol: token.symbol || '',
            name: token.name || '',
            decimals: token.decimals || 0,
            enabled: isPriorityToken || !!externalWallet,
            chainId: sdk.lineaChainId,
            chainName: 'Linea',
            balance: externalWallet?.balance || '0',
            balanceFiat: externalWallet?.balance
              ? `$${externalWallet.balance}`
              : '$0.00',
            image: iconUrl,
            logo: iconUrl,
            allowanceState: isPriorityToken
              ? AllowanceState.Enabled
              : externalWallet
              ? AllowanceState.Limited
              : AllowanceState.NotEnabled,
            allowance: externalWallet?.allowance || '0',
          };
        });

        setSupportedTokens(tokensWithStatus);
      } catch (error) {
        console.error('Error fetching supported tokens:', error);
        setSupportedTokens([]);
      } finally {
        setIsLoading(false);
      }
    }, [sdk, selectedAddress, priorityToken, isAuthenticated]);

    // Load tokens when component mounts
    useEffect(() => {
      if (selectedAddress) {
        // Reset tokens when opening the bottom sheet
        setSupportedTokens([]);
        getSupportedTokens();
      }
    }, [selectedAddress, getSupportedTokens]);

    const handleTokenPress = useCallback(
      (token: SupportedTokenWithChain) => {
        // Check if this token is already the priority token
        const isAlreadyPriorityToken =
          priorityToken &&
          priorityToken.address?.toLowerCase() ===
            token.address?.toLowerCase() &&
          priorityToken.symbol?.toLowerCase() === token.symbol?.toLowerCase();

        if (isAlreadyPriorityToken) {
          // Token is already the priority token
          if (navigateToCardHomeOnPriorityToken) {
            // Navigate back to CardHome and close bottom sheet
            navigation.navigate(Routes.CARD.HOME);
            onClose();
          } else {
            // Just close the bottom sheet
            onClose();
          }
        } else if (token.enabled) {
          // Token is already in external wallets but not priority, update priority directly
          const updatePriority = async () => {
            if (!sdk) {
              return;
            }

            try {
              // Get current wallet details
              const currentWalletDetails =
                await sdk.getCardExternalWalletDetails();

              // Find the wallet ID for the selected token
              const selectedWallet = currentWalletDetails.find(
                (wallet) =>
                  wallet.currency?.toLowerCase() === token.symbol.toLowerCase(),
              );

              if (selectedWallet) {
                // Create new priority order: selected token becomes priority 1, others shift down
                const newPriorities = currentWalletDetails.map(
                  (wallet, index) => ({
                    id: wallet.id,
                    priority: wallet.id === selectedWallet.id ? 1 : index + 2,
                  }),
                );

                await sdk.updateWalletPriority(newPriorities);

                // Set the selected token as the priority token in Redux
                const priorityTokenData = {
                  address: token.address,
                  decimals: token.decimals,
                  symbol: token.symbol,
                  name: token.name,
                  allowanceState: AllowanceState.Enabled,
                  allowance: BAANX_MAX_LIMIT, // Full spending access
                  availableBalance: '0',
                  walletAddress: selectedAccount?.address || '',
                  chainId: token.chainId.startsWith('0x')
                    ? token.chainId
                    : `0x${parseInt(
                        token.chainId.replace('eip155:', ''),
                      ).toString(16)}`,
                  isStaked: false,
                };

                dispatch(setAuthenticatedPriorityToken(priorityTokenData));
                dispatch(setAuthenticatedPriorityTokenLastFetched(new Date()));
              }
            } catch (error) {
              console.error('Error updating wallet priority:', error);
            }
          };

          updatePriority();
          onClose();
        } else {
          // Token is not in external wallets, navigate to Change Asset screen
          navigation.navigate(Routes.CARD.CHANGE_ASSET, {
            selectedToken: token,
            priorityToken,
          });
          onClose();
        }
      },
      [
        navigation,
        priorityToken,
        onClose,
        navigateToCardHomeOnPriorityToken,
        dispatch,
        sdk,
        selectedAccount?.address,
      ],
    );

    const renderTokenItem = useCallback(
      (token: SupportedTokenWithChain) => {
        // Convert CAIP chain ID to hex format for network badge
        const decimalChainId = token.chainId.replace('eip155:', '');
        const hexChainId = `0x${parseInt(decimalChainId).toString(16)}`;

        return (
          <TouchableOpacity
            key={`${token.address}-${token.symbol}`}
            onPress={() => handleTokenPress(token)}
            style={tw.style(
              'flex-row items-center py-3 px-4 border-b border-border-muted',
            )}
          >
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
                    token.enabled && token.chainId ? (
                      <Badge
                        variant={BadgeVariant.Network}
                        imageSource={NetworkBadgeSource(hexChainId as Hex)}
                      />
                    ) : null
                  }
                >
                  <AvatarToken
                    size={AvatarSize.Md}
                    imageSource={{ uri: token.image || token.logo }}
                  />
                </BadgeWrapper>
                <Box twClassName="flex-1">
                  <Text
                    variant={TextVariant.BodyMD}
                    style={tw.style('font-semibold')}
                  >
                    {token.symbol}
                  </Text>
                  <Text
                    variant={TextVariant.BodySM}
                    style={tw.style('mt-1 font-medium text-text-alternative')}
                  >
                    {token.allowanceState === AllowanceState.Enabled
                      ? 'Enabled'
                      : token.allowanceState === AllowanceState.Limited
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
                  {token.balanceFiat}
                </Text>
                <Text
                  variant={TextVariant.BodyXS}
                  style={tw.style('text-text-alternative mt-1')}
                >
                  {token.balance} {token.symbol}
                </Text>
              </Box>
            </Box>
          </TouchableOpacity>
        );
      },
      [handleTokenPress, tw],
    );

    const handleClose = useCallback(() => {
      onClose();
    }, [onClose]);

    // Removed pan responder - using simple close functionality

    return (
      <View style={tw.style('absolute inset-0 z-50')}>
        {/* Overlay */}
        <TouchableOpacity
          style={tw.style('absolute inset-0 bg-black/50')}
          onPress={handleClose}
          activeOpacity={1}
        />

        {/* Bottom Sheet */}
        <View
          style={[
            tw.style('absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl'),
            styles.scrollView,
          ]}
        >
          {/* Drag Handle */}
          <View
            style={[tw.style('self-center mt-3 mb-3'), styles.dragHandle]}
          />

          {/* Header */}
          <View
            style={tw.style('flex-row items-center justify-center px-4 py-2')}
          >
            <Text
              variant={TextVariant.HeadingSM}
              style={tw.style('font-semibold text-center')}
            >
              {strings('card.select_asset')}
            </Text>
            <ButtonIcon
              iconName={IconName.Close}
              size={ButtonIconSizes.Md}
              onPress={handleClose}
              style={tw.style('absolute right-4')}
            />
          </View>

          {/* Token List */}
          <ScrollView
            style={tw.style('flex-shrink')}
            contentContainerStyle={tw.style('pb-6')}
            showsVerticalScrollIndicator
          >
            {!selectedAddress ? (
              <View style={tw.style('items-center justify-center py-8')}>
                <ActivityIndicator
                  size="large"
                  color={theme.colors.primary.default}
                />
                <Text
                  variant={TextVariant.BodySM}
                  style={tw.style('mt-3 text-center')}
                >
                  Loading account information...
                </Text>
              </View>
            ) : isLoading ? (
              // Skeleton loader for token list
              <View style={tw.style('px-4')}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <View
                    key={index}
                    style={tw.style(
                      'flex-row items-center py-3 border-b border-border-muted',
                    )}
                  >
                    {/* Token icon skeleton */}
                    <View
                      style={tw.style(
                        'w-10 h-10 rounded-full bg-border-muted mr-3',
                      )}
                    />
                    {/* Token info skeleton */}
                    <View style={tw.style('flex-1')}>
                      <View
                        style={tw.style(
                          'h-4 bg-border-muted rounded w-16 mb-2',
                        )}
                      />
                      <View
                        style={tw.style('h-3 bg-border-muted rounded w-20')}
                      />
                    </View>
                    {/* Balance skeleton */}
                    <View style={tw.style('items-end')}>
                      <View
                        style={tw.style(
                          'h-4 bg-border-muted rounded w-12 mb-2',
                        )}
                      />
                      <View
                        style={tw.style('h-3 bg-border-muted rounded w-16')}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : supportedTokens.length > 0 ? (
              supportedTokens.map(renderTokenItem)
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
          </ScrollView>
        </View>
      </View>
    );
  },
);

AssetSelectionBottomSheet.displayName = 'AssetSelectionBottomSheet';

export default AssetSelectionBottomSheet;
