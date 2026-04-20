import React, { useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Icon,
  IconName,
  IconSize,
  IconColor,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';

import { strings } from '../../../../../../../locales/i18n';
import InfoSection from '../../UI/info-row/info-section';
import InfoRow from '../../UI/info-row';
import GasFeesDetailsRow, {
  GasFeesDetailsRowSkeleton,
} from '../../rows/transactions/gas-fee-details-row';
import AdvancedDetailsRow from '../../rows/transactions/advanced-details-row';
import AvatarAccount from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import useNavbar from '../../../hooks/ui/useNavbar';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { ConfirmationInfoComponentIDs } from '../../../constants/info-ids';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { toTokenMinimalUnit } from '../../../../../../util/number';
import { selectSelectedInternalAccount } from '../../../../../../selectors/accountsController';
import { selectAvatarAccountType } from '../../../../../../selectors/settings';
import { useAccountGroupName } from '../../../../../hooks/multichainAccounts/useAccountGroupName';
import { encodeApproveTransaction } from '../../../../../UI/Card/util/encodeApproveTransaction';
import {
  selectCardDelegationState,
  setDelegationSelectedToken,
  setDelegationLimit,
} from '../../../../../../core/redux/slices/card';
import { BAANX_MAX_LIMIT } from '../../../../../UI/Card/constants';
import { createAssetSelectionModalNavigationDetails } from '../../../../../UI/Card/components/AssetSelectionBottomSheet/AssetSelectionBottomSheet';
import LimitOptionItem from '../../../../../UI/Card/Views/SpendingLimit/components/LimitOptionItem';
import type { LimitType, CardFundingToken } from '../../../../../UI/Card/types';
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
}

const styles = StyleSheet.create({
  tokenIcon: {
    alignSelf: 'center',
  },
});

export function CardDelegationInfo() {
  useNavbar('');

  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  const transactionMetadata = useTransactionMetadataRequest();

  const delegationState = useSelector(selectCardDelegationState);

  const { canChangeToken } = delegationState;
  const [selectedToken, setSelectedToken] = useState<CardFundingToken | null>(
    delegationState.selectedToken,
  );
  const [limitType, setLimitType] = useState<LimitType>('full');
  const [customLimit, setCustomLimit] = useState('');
  const [isLimitExpanded, setIsLimitExpanded] = useState(false);

  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const accountGroupName = useAccountGroupName();

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
      if (!transactionMetadata?.id || !newToken.delegationContract) {
        return;
      }

      const tokenAddress = newToken.stagingTokenAddress || newToken.address;
      if (!tokenAddress) return;

      try {
        const amountInMinimalUnits = toTokenMinimalUnit(
          limitType === 'full' ? BAANX_MAX_LIMIT : customLimit || '0',
          newToken.decimals ?? 18,
        ).toString();

        const transactionData = encodeApproveTransaction(
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
    [transactionMetadata, limitType, customLimit],
  );

  // Handle returns from AssetSelectionBottomSheet
  useFocusEffect(
    useCallback(() => {
      const params = route.params as RouteParams | undefined;

      if (params?.returnedSelectedToken) {
        const newToken = params.returnedSelectedToken;
        setSelectedToken(newToken);
        dispatch(setDelegationSelectedToken(newToken));
        updateTransactionWithNewToken(newToken);
        navigation.setParams({
          returnedSelectedToken: undefined,
        } as Record<string, unknown>);
      }
      // eslint-disable-next-line react-compiler/react-compiler
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route.params]),
  );

  // EVM: rendered inside REDESIGNED_CONFIRMATIONS (transactionMetadata exists).
  // Solana: rendered inside SolanaCardDelegationScreen (no EVM tx, no metadata).
  // Sheets must navigate back to the correct caller screen.
  const callerRoute = transactionMetadata
    ? Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS
    : Routes.CARD.SOLANA_CARD_DELEGATION;

  const handleTokenSelect = useCallback(() => {
    const excludedTokens = selectedToken ? [selectedToken] : [];
    navigation.navigate(
      ...createAssetSelectionModalNavigationDetails({
        selectionOnly: true,
        excludedTokens,
        callerRoute,
        callerParams: {},
      }),
    );
  }, [navigation, selectedToken, callerRoute]);

  const handleLimitTypeChange = useCallback(
    (newLimitType: LimitType) => {
      setLimitType(newLimitType);
      dispatch(setDelegationLimit({ limitType: newLimitType, customLimit }));
    },
    [customLimit, dispatch],
  );

  const handleCustomLimitChange = useCallback(
    (value: string) => {
      const sanitized = sanitizeCustomLimit(value);
      setCustomLimit(sanitized);
      dispatch(setDelegationLimit({ limitType, customLimit: sanitized }));
    },
    [limitType, dispatch],
  );

  return (
    <Box testID={ConfirmationInfoComponentIDs.CARD_DELEGATION}>
      {/* Page title — displayed in content, not navbar */}
      <Text variant={TextVariant.HeadingMd} twClassName="mb-4">
        {strings('confirm.title.card_delegation')}
      </Text>

      {/* Token row */}
      {selectedToken &&
        (canChangeToken ? (
          <TouchableOpacity
            onPress={handleTokenSelect}
            activeOpacity={0.7}
            testID="card-delegation-token-row"
          >
            <InfoSection>
              <InfoRow label={strings('card.card_spending_limit.token_label')}>
                <Box twClassName="flex-row items-center gap-2 shrink">
                  {tokenIconUrl && (
                    <BadgeWrapper
                      style={styles.tokenIcon}
                      badgePosition={BadgePosition.BottomRight}
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
                    numberOfLines={1}
                    twClassName="shrink"
                  >
                    {tokenLabel}
                  </Text>
                  <Icon
                    name={IconName.ArrowDown}
                    size={IconSize.Sm}
                    color={IconColor.IconDefault}
                  />
                </Box>
              </InfoRow>
            </InfoSection>
          </TouchableOpacity>
        ) : (
          <InfoSection testID="card-delegation-token-row">
            <InfoRow label={strings('card.card_spending_limit.token_label')}>
              <Box twClassName="flex-row items-center gap-2 shrink">
                {tokenIconUrl && (
                  <BadgeWrapper
                    style={styles.tokenIcon}
                    badgePosition={BadgePosition.BottomRight}
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
                  numberOfLines={1}
                  twClassName="shrink"
                >
                  {tokenLabel}
                </Text>
              </Box>
            </InfoRow>
          </InfoSection>
        ))}

      {/* Account row — static display */}
      {selectedAccount && (
        <InfoSection testID="card-delegation-account-row">
          <InfoRow label={strings('card.card_spending_limit.account_label')}>
            <Box twClassName="flex-row items-center gap-2 shrink">
              <AvatarAccount
                type={avatarAccountType}
                accountAddress={selectedAccount.address}
                size={AvatarSize.Xs}
              />
              <Text
                variant={TextVariant.BodyMd}
                numberOfLines={1}
                twClassName="shrink"
              >
                {accountGroupName ?? selectedAccount.metadata.name}
              </Text>
            </Box>
          </InfoRow>
        </InfoSection>
      )}

      {/* Spending limit row — toggles inline panel */}
      <TouchableOpacity
        onPress={() => setIsLimitExpanded((prev) => !prev)}
        activeOpacity={0.7}
        testID="card-delegation-limit-row"
      >
        <InfoSection>
          <InfoRow
            label={strings('card.card_spending_limit.restricted_limit_title')}
          >
            <Box twClassName="flex-row items-center gap-2 shrink">
              <Text
                variant={TextVariant.BodyMd}
                numberOfLines={1}
                twClassName="shrink"
              >
                {spendingLimitLabel}
              </Text>
              <Icon
                name={isLimitExpanded ? IconName.ArrowUp : IconName.ArrowDown}
                size={IconSize.Sm}
                color={IconColor.IconDefault}
              />
            </Box>
          </InfoRow>
        </InfoSection>
      </TouchableOpacity>

      {/* Inline spending limit options */}
      {isLimitExpanded && (
        <InfoSection>
          <LimitOptionItem
            title={strings('card.card_spending_limit.full_access_title')}
            description={strings(
              'card.card_spending_limit.full_access_description',
            )}
            isSelected={limitType === 'full'}
            onPress={() => handleLimitTypeChange('full')}
            testID="limit-option-full"
          />
          <LimitOptionItem
            title={strings('card.card_spending_limit.restricted_limit_title')}
            description={strings(
              'card.card_spending_limit.restricted_limit_description',
            )}
            isSelected={limitType === 'restricted'}
            showInput
            inputValue={customLimit}
            onInputChange={handleCustomLimitChange}
            onPress={() => handleLimitTypeChange('restricted')}
            testID="limit-option-restricted"
          />
        </InfoSection>
      )}

      {/* Gas fees — EVM only */}
      {transactionMetadata && <GasFeesDetailsRow />}

      {/* Advanced details — EVM only */}
      {transactionMetadata && <AdvancedDetailsRow />}
    </Box>
  );
}

export function CardDelegationInfoSkeleton() {
  useNavbar('');

  return (
    <Box testID="card-delegation-info-skeleton">
      <Box twClassName="mb-4">
        <Skeleton height={28} width={200} />
      </Box>
      <InfoSection>
        <Box twClassName="flex-row justify-between px-2 py-3">
          <Skeleton width={80} height={16} />
          <Skeleton width={120} height={16} />
        </Box>
      </InfoSection>
      <InfoSection>
        <Box twClassName="flex-row justify-between px-2 py-3">
          <Skeleton width={80} height={16} />
          <Skeleton width={140} height={16} />
        </Box>
      </InfoSection>
      <InfoSection>
        <Box twClassName="flex-row justify-between px-2 py-3">
          <Skeleton width={100} height={16} />
          <Skeleton width={100} height={16} />
        </Box>
      </InfoSection>
      <GasFeesDetailsRowSkeleton />
    </Box>
  );
}
