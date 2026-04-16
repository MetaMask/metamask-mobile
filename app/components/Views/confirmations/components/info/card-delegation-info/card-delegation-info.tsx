import React, { useCallback, useContext, useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  StackActions,
} from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
  Icon,
  IconName,
  IconSize,
  IconColor,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { strings } from '../../../../../../../locales/i18n';
import InfoSection from '../../UI/info-row/info-section';
import InfoRowDivider from '../../UI/info-row-divider';
import AccountRow from '../../rows/transactions/account-row';
import NetworkRow from '../../rows/transactions/network-row';
import GasFeesDetailsRow from '../../rows/transactions/gas-fee-details-row';
import useNavbar from '../../../hooks/ui/useNavbar';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { ConfirmationInfoComponentIDs } from '../../../constants/info-ids';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { safeToChecksumAddress } from '../../../../../../util/address';
import { toTokenMinimalUnit } from '../../../../../../util/number';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import { useCardSDK } from '../../../../../UI/Card/sdk';
import { useNeedsGasFaucet } from '../../../../../UI/Card/hooks/useNeedsGasFaucet';
import {
  selectCardDelegationState,
  selectDelegationCredentials,
  setDelegationCredentials,
  clearDelegationCredentials,
  resetDelegationState,
} from '../../../../../../core/redux/slices/card';
import {
  caipChainIdToNetwork,
  BAANX_MAX_LIMIT,
} from '../../../../../UI/Card/constants';
import { generateSignatureMessage } from '../../../../../UI/Card/util/delegation';
import { createSpendingLimitOptionsNavigationDetails } from '../../../../../UI/Card/Views/SpendingLimit/components/SpendingLimitOptionsSheet';
import { createAssetSelectionModalNavigationDetails } from '../../../../../UI/Card/components/AssetSelectionBottomSheet/AssetSelectionBottomSheet';
import type { LimitType, CardFundingToken } from '../../../../../UI/Card/types';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../../component-library/components/Toast';
import { IconName as ComponentLibraryIconName } from '../../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../../util/theme';
import Routes from '../../../../../../constants/navigation/Routes';
import { sanitizeCustomLimit } from '../../../../../UI/Card/util/sanitizeCustomLimit';
import { buildTokenIconUrl } from '../../../../../UI/Card/util/buildTokenIconUrl';
import { mapCaipChainIdToChainName } from '../../../../../UI/Card/util/mapCaipChainIdToChainName';
import { LINEA_CAIP_CHAIN_ID } from '../../../../../UI/Card/util/buildTokenList';
import AvatarToken from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import { safeFormatChainIdToHex } from '../../../../../UI/Card/util/safeFormatChainIdToHex';
import { NetworkBadgeSource } from '../../../../../UI/AssetOverview/Balance/Balance';

interface RouteParams {
  returnedSelectedToken?: CardFundingToken;
  returnedLimitType?: LimitType;
  returnedCustomLimit?: string;
}

export function CardDelegationInfo() {
  useNavbar(strings('confirm.title.card_delegation'));

  const tw = useTailwind();
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { toastRef } = useContext(ToastContext);

  const { onConfirm, onReject } = useConfirmActions();
  const transactionMetadata = useTransactionMetadataRequest();
  const { sdk } = useCardSDK();

  const delegationState = useSelector(selectCardDelegationState);
  const pendingCredentials = useSelector(selectDelegationCredentials);
  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );

  const { flow, canChangeToken } = delegationState;
  const [selectedToken, setSelectedToken] = useState<CardFundingToken | null>(
    delegationState.selectedToken,
  );
  const [limitType, setLimitType] = useState<LimitType>('full');
  const [customLimit, setCustomLimit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { needsFaucet } = useNeedsGasFaucet(selectedToken);

  // Derived display values
  const tokenLabel = selectedToken
    ? `${selectedToken.symbol} on ${mapCaipChainIdToChainName(selectedToken.caipChainId ?? LINEA_CAIP_CHAIN_ID)}`
    : '';

  const tokenIconUrl =
    selectedToken?.address || selectedToken?.stagingTokenAddress
      ? buildTokenIconUrl(
          selectedToken.caipChainId ?? LINEA_CAIP_CHAIN_ID,
          (selectedToken.stagingTokenAddress || selectedToken.address) ?? '',
        )
      : null;

  const spendingLimitLabel =
    limitType === 'full'
      ? strings('card.card_spending_limit.full_access_title')
      : customLimit || '0';

  const updateTransactionWithNewToken = useCallback(
    async (newToken: CardFundingToken) => {
      if (!sdk || !transactionMetadata?.id || !newToken.delegationContract) {
        return;
      }

      const tokenAddress = newToken.stagingTokenAddress || newToken.address;
      if (!tokenAddress) return;

      try {
        const amountInMinimalUnits = toTokenMinimalUnit(
          limitType === 'full' ? BAANX_MAX_LIMIT : customLimit || '0',
          newToken.decimals ?? 18,
        ).toString();

        const transactionData = sdk.encodeApproveTransaction(
          newToken.delegationContract,
          amountInMinimalUnits,
        );

        Engine.context.TransactionController.updateTransaction(
          {
            ...transactionMetadata,
            txParams: {
              ...transactionMetadata.txParams,
              to: tokenAddress,
              data: transactionData,
            },
          },
          'Card delegation token update',
        );
      } catch (error) {
        Logger.error(
          error as Error,
          'CardDelegationInfo: Failed to update transaction with new token',
        );
      }
    },
    [sdk, transactionMetadata, limitType, customLimit],
  );

  const updateTransactionWithNewLimit = useCallback(
    async (newLimitType: LimitType, newCustomLimit: string) => {
      if (
        !sdk ||
        !transactionMetadata?.id ||
        !selectedToken?.delegationContract
      ) {
        return;
      }

      try {
        const amount =
          newLimitType === 'full' ? BAANX_MAX_LIMIT : newCustomLimit || '0';

        const amountInMinimalUnits = toTokenMinimalUnit(
          amount,
          selectedToken.decimals ?? 18,
        ).toString();

        const transactionData = sdk.encodeApproveTransaction(
          selectedToken.delegationContract,
          amountInMinimalUnits,
        );

        Engine.context.TransactionController.updateTransaction(
          {
            ...transactionMetadata,
            txParams: {
              ...transactionMetadata.txParams,
              data: transactionData,
            },
          },
          'Card delegation limit update',
        );
      } catch (error) {
        Logger.error(
          error as Error,
          'CardDelegationInfo: Failed to update transaction with new limit',
        );
      }
    },
    [sdk, transactionMetadata, selectedToken],
  );

  // Handle returns from AssetSelectionBottomSheet and SpendingLimitOptionsSheet
  useFocusEffect(
    useCallback(() => {
      const params = route.params as RouteParams | undefined;

      if (params?.returnedSelectedToken) {
        const newToken = params.returnedSelectedToken;
        setSelectedToken(newToken);
        updateTransactionWithNewToken(newToken);
        navigation.setParams({
          returnedSelectedToken: undefined,
        } as Record<string, unknown>);
      }

      if (params?.returnedLimitType !== undefined) {
        setLimitType(params.returnedLimitType);
        const newCustomLimit = params.returnedCustomLimit ?? '';
        setCustomLimit(sanitizeCustomLimit(newCustomLimit));
        updateTransactionWithNewLimit(params.returnedLimitType, newCustomLimit);
        navigation.setParams({
          returnedLimitType: undefined,
          returnedCustomLimit: undefined,
        } as Record<string, unknown>);
      }
      // eslint-disable-next-line react-compiler/react-compiler
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route.params]),
  );

  // Subscribe to transactionConfirmed to complete the delegation after tx is mined
  useEffect(() => {
    if (!transactionMetadata?.id || !pendingCredentials) return;

    const transactionId = transactionMetadata.id;

    const unsubscribe = Engine.controllerMessenger.subscribeOnceIf(
      'TransactionController:transactionConfirmed',
      async (meta) => {
        try {
          const { jwt, signature, signatureMessage } = pendingCredentials;
          const address =
            safeToChecksumAddress(selectAccountByScope('eip155:0')?.address) ??
            '';
          const network = selectedToken?.caipChainId
            ? caipChainIdToNetwork[selectedToken.caipChainId]
            : null;

          if (sdk && network && meta.hash) {
            await sdk.completeDelegation({
              address,
              network,
              currency: selectedToken?.symbol?.toLowerCase() ?? '',
              amount:
                limitType === 'full' ? BAANX_MAX_LIMIT : customLimit || '0',
              txHash: meta.hash,
              sigHash: signature,
              sigMessage: signatureMessage,
              token: jwt,
            });
          }

          dispatch(clearDelegationCredentials());

          // Refresh card home data after delegation is complete
          await Engine.context.CardController.fetchCardHomeData();

          if (flow !== 'onboarding') {
            toastRef?.current?.showToast({
              variant: ToastVariants.Icon,
              labelOptions: [
                {
                  label: strings('card.card_spending_limit.update_success'),
                },
              ],
              iconName: ComponentLibraryIconName.Confirmation,
              iconColor: theme.colors.success.default,
              backgroundColor: theme.colors.success.muted,
              hasNoTimeout: false,
            });
          }
        } catch (error) {
          Logger.error(
            error as Error,
            'CardDelegationInfo: Failed to complete delegation',
          );
        } finally {
          dispatch(resetDelegationState());
          // Navigate based on flow
          if (flow === 'onboarding') {
            navigation.dispatch(StackActions.replace(Routes.CARD.HOME));
          } else {
            navigation.goBack();
          }
        }
      },
      (meta) => meta.id === transactionId,
    );

    return () => {
      unsubscribe?.(transactionMetadata);
    };
  }, [
    transactionMetadata,
    pendingCredentials,
    sdk,
    selectedToken,
    limitType,
    customLimit,
    flow,
    dispatch,
    navigation,
    selectAccountByScope,
    toastRef,
    theme,
  ]);

  const handleTokenSelect = useCallback(() => {
    const excludedTokens = selectedToken ? [selectedToken] : [];
    navigation.navigate(
      ...createAssetSelectionModalNavigationDetails({
        selectionOnly: true,
        excludedTokens,
        callerRoute: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        callerParams: {},
      }),
    );
  }, [navigation, selectedToken]);

  const handleLimitSelect = useCallback(() => {
    navigation.navigate(
      ...createSpendingLimitOptionsNavigationDetails({
        currentLimitType: limitType,
        currentCustomLimit: customLimit,
        callerRoute: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        callerParams: {},
      }),
    );
  }, [navigation, limitType, customLimit]);

  const handleConfirm = useCallback(async () => {
    if (!sdk || !selectedToken) return;

    const network = selectedToken.caipChainId
      ? caipChainIdToNetwork[selectedToken.caipChainId]
      : null;

    if (!network) {
      Logger.error(
        new Error('Unsupported network for card delegation'),
        'CardDelegationInfo: Missing network',
      );
      return;
    }

    const userAccount = selectAccountByScope('eip155:0');
    const address = safeToChecksumAddress(userAccount?.address);
    if (!address) {
      Logger.error(
        new Error('No EVM account found'),
        'CardDelegationInfo: handleConfirm',
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Generate delegation JWT token
      const { token: jwt, nonce } = await sdk.generateDelegationToken(
        network,
        address,
        needsFaucet,
      );

      // Step 2: Sign SIWE message
      const signatureMessage = generateSignatureMessage(
        address,
        nonce,
        network,
        selectedToken.caipChainId,
      );
      const signature =
        await Engine.context.KeyringController.signPersonalMessage({
          data: '0x' + Buffer.from(signatureMessage, 'utf8').toString('hex'),
          from: address,
        });

      // Step 3: Store credentials so the transactionConfirmed listener can use them
      dispatch(
        setDelegationCredentials({
          jwt,
          signature,
          signatureMessage,
        }),
      );

      // Step 4: Approve the pending transaction (triggers mining)
      await onConfirm();
    } catch (error) {
      setIsSubmitting(false);
      Logger.error(error as Error, 'CardDelegationInfo: handleConfirm failed');
    }
  }, [
    sdk,
    selectedToken,
    selectAccountByScope,
    needsFaucet,
    dispatch,
    onConfirm,
  ]);

  const handleCancel = useCallback(async () => {
    dispatch(resetDelegationState());
    await onReject();
  }, [dispatch, onReject]);

  return (
    <View testID={ConfirmationInfoComponentIDs.CARD_DELEGATION}>
      {/* Token row */}
      {canChangeToken && selectedToken && (
        <InfoSection>
          <TouchableOpacity
            onPress={handleTokenSelect}
            activeOpacity={0.7}
            testID="card-delegation-token-row"
          >
            <Box twClassName="flex-row items-center p-4">
              <Text
                variant={TextVariant.BodyMd}
                twClassName="flex-1 text-text-alternative"
              >
                {strings('card.card_spending_limit.token_label')}
              </Text>
              <Box twClassName="flex-row items-center gap-2 shrink min-w-0">
                {tokenIconUrl && (
                  <BadgeWrapper
                    badgePosition={BadgePosition.BottomRight}
                    style={tw.style('self-center')}
                    badgeElement={
                      <Badge
                        variant={BadgeVariant.Network}
                        imageSource={NetworkBadgeSource(
                          safeFormatChainIdToHex(
                            selectedToken.caipChainId ?? LINEA_CAIP_CHAIN_ID,
                          ) as `0x${string}`,
                        )}
                      />
                    }
                  >
                    <AvatarToken
                      name={selectedToken.symbol ?? ''}
                      imageSource={{ uri: tokenIconUrl }}
                      size={AvatarSize.Xs}
                    />
                  </BadgeWrapper>
                )}
                <Text
                  variant={TextVariant.BodyMd}
                  twClassName="text-text-default font-medium self-center shrink"
                  numberOfLines={1}
                >
                  {tokenLabel}
                </Text>
                <Icon
                  name={IconName.ArrowDown}
                  size={IconSize.Md}
                  color={IconColor.IconDefault}
                  style={tw.style('self-center shrink-0')}
                />
              </Box>
            </Box>
          </TouchableOpacity>
        </InfoSection>
      )}

      {/* Account + network rows */}
      <InfoSection>
        <AccountRow label={strings('card.card_spending_limit.account_label')} />
        <InfoRowDivider />
        <NetworkRow />
      </InfoSection>

      {/* Spending limit row */}
      <InfoSection>
        <TouchableOpacity
          onPress={handleLimitSelect}
          activeOpacity={0.7}
          testID="card-delegation-limit-row"
        >
          <Box twClassName="flex-row items-center p-4">
            <Text
              variant={TextVariant.BodyMd}
              twClassName="flex-1 text-text-alternative"
            >
              {strings('card.card_spending_limit.restricted_limit_title')}
            </Text>
            <Box twClassName="flex-row items-center gap-2 shrink min-w-0">
              <Text
                variant={TextVariant.BodyMd}
                twClassName="text-text-default font-medium self-center shrink"
                numberOfLines={1}
              >
                {spendingLimitLabel}
              </Text>
              <Icon
                name={IconName.ArrowDown}
                size={IconSize.Md}
                color={IconColor.IconDefault}
                style={tw.style('self-center shrink-0')}
              />
            </Box>
          </Box>
        </TouchableOpacity>
      </InfoSection>

      {/* Gas fees */}
      <GasFeesDetailsRow />

      {/* Custom confirm/cancel buttons */}
      <Box twClassName="gap-3 mt-6 px-4 pb-4">
        <Box twClassName="flex-row gap-3">
          <Box twClassName="flex-1">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              onPress={handleCancel}
              isFullWidth
              isDisabled={isSubmitting}
            >
              {strings('card.card_spending_limit.cancel')}
            </Button>
          </Box>
          <Box twClassName="flex-1">
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              onPress={handleConfirm}
              isFullWidth
              isDisabled={isSubmitting || !selectedToken}
              isLoading={isSubmitting}
            >
              {strings('card.card_spending_limit.confirm_new_limit')}
            </Button>
          </Box>
        </Box>
      </Box>
    </View>
  );
}
