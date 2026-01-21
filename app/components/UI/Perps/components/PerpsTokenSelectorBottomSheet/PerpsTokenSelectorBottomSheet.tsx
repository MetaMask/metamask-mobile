import React, { useRef, useEffect, memo, useMemo, useCallback } from 'react';
import { View, TouchableOpacity, FlatList } from 'react-native';
import { useSelector } from 'react-redux';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { useTheme } from '../../../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import BadgeNetwork from '../../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';
import { createStyles } from './PerpsTokenSelectorBottomSheet.styles';
import { strings } from '../../../../../../locales/i18n';
import type { PerpsToken } from '../../types/perps-types';
import PerpsTokenLogo from '../PerpsTokenLogo';
import { usePerpsPaymentTokens } from '../../hooks/usePerpsPaymentTokens';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { getNetworkImageSource } from '../../../../../util/networks';
import type { Hex, CaipChainId } from '@metamask/utils';

interface PerpsTokenSelectorBottomSheetProps {
  isVisible?: boolean;
  onClose: () => void;
  onSelect: (token: PerpsToken) => void;
  selectedToken?: PerpsToken;
  sheetRef?: React.RefObject<BottomSheetRef>;
}

const PerpsTokenSelectorBottomSheet: React.FC<
  PerpsTokenSelectorBottomSheetProps
> = ({
  isVisible = true,
  onClose,
  onSelect,
  selectedToken,
  sheetRef: externalSheetRef,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef || internalSheetRef;

  // Get available payment tokens (all tokens, not filtered by minimum)
  const paymentTokens = usePerpsPaymentTokens();
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  // Helper to get network name from chainId
  const getNetworkName = useCallback(
    (chainId: Hex | CaipChainId): string => {
      const networkConfig = networkConfigurations?.[chainId as Hex];
      return (
        networkConfig?.name || strings('network_information.unknown_network')
      );
    },
    [networkConfigurations],
  );

  // Helper to get network image source
  const getNetworkImage = useCallback((chainId: Hex | CaipChainId) => {
    return getNetworkImageSource({ chainId });
  }, []);

  useEffect(() => {
    if (isVisible && !externalSheetRef) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible, externalSheetRef, sheetRef]);

  const handleSelect = (token: PerpsToken) => {
    onSelect(token);
    onClose();
  };

  const renderTokenItem = ({ item: token }: { item: PerpsToken }) => {
    const isSelected =
      selectedToken?.address === token.address &&
      selectedToken?.chainId === token.chainId;

    const networkName = getNetworkName(token.chainId);
    const networkImageSource = getNetworkImage(token.chainId);

    // Format token balance with symbol (balance is already formatted from useTokensWithBalance)
    const tokenBalance = token.balance
      ? `${token.balance} ${token.symbol}`
      : `0 ${token.symbol}`;

    return (
      <TouchableOpacity
        style={[styles.tokenItem, isSelected && styles.tokenItemSelected]}
        onPress={() => handleSelect(token)}
      >
        <View style={styles.tokenItemContent}>
          <BadgeWrapper
            badgePosition={BadgePosition.BottomRight}
            badgeElement={
              <BadgeNetwork
                name={networkName}
                imageSource={networkImageSource}
              />
            }
          >
            <PerpsTokenLogo
              symbol={token.symbol}
              size={40}
              style={styles.tokenLogo}
            />
          </BadgeWrapper>
          <View style={styles.tokenInfo}>
            <Text variant={TextVariant.BodyLGMedium} color={TextColor.Default}>
              {token.symbol}
            </Text>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {networkName}
            </Text>
            <View style={styles.tokenBalanceRow}>
              <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
                {tokenBalance}
              </Text>
              {token.balanceFiat && (
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                  style={styles.tokenBalanceFiat}
                >
                  {token.balanceFiat}
                </Text>
              )}
            </View>
          </View>
        </View>
        {isSelected && (
          <Icon
            name={IconName.Check}
            size={IconSize.Md}
            color={IconColor.Primary}
          />
        )}
      </TouchableOpacity>
    );
  };

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={!externalSheetRef}
      onClose={externalSheetRef ? undefined : onClose}
    >
      <BottomSheetHeader onClose={onClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('perps.order.select_payment_token')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.container}>
        <FlatList
          data={paymentTokens}
          renderItem={renderTokenItem}
          keyExtractor={(item, index) =>
            `${item.address}-${item.chainId}-${index}`
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.order.no_payment_tokens')}
              </Text>
            </View>
          }
        />
      </View>
    </BottomSheet>
  );
};

PerpsTokenSelectorBottomSheet.displayName = 'PerpsTokenSelectorBottomSheet';

export default memo(
  PerpsTokenSelectorBottomSheet,
  (prevProps, nextProps) =>
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.selectedToken?.address === nextProps.selectedToken?.address &&
    prevProps.selectedToken?.chainId === nextProps.selectedToken?.chainId,
);
