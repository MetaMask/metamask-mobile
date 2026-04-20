import React, { useCallback, useMemo, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  Button,
  ButtonVariant,
  ButtonBaseSize,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import BadgeNetwork from '../../../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';
import { getNetworkImageSource } from '../../../../../../util/networks';
import type { Hex } from '@metamask/utils';
import type { AssetType } from '../../../../confirmations/types/token';
import { useTransactionPayToken } from '../../../../confirmations/hooks/pay/useTransactionPayToken';
import { useTransactionPayAvailableTokens } from '../../../../confirmations/hooks/pay/useTransactionPayAvailableTokens';
import SourceTokenPicker from './SourceTokenPicker';
import { strings } from '../../../../../../../locales/i18n';

const USD_PRESETS = ['1', '20', '50', '100'];

interface QuickBuyFooterProps {
  usdAmount: string;
  totalPayUsd: string | undefined;
  isConfirmDisabled: boolean;
  isConfirmLoading: boolean;
  getButtonLabel: () => string;
  onPresetPress: (preset: string) => void;
  onConfirm: () => Promise<void>;
  colors: { icon: { alternative: string } };
}

const QuickBuyFooter: React.FC<QuickBuyFooterProps> = ({
  usdAmount,
  totalPayUsd,
  isConfirmDisabled,
  isConfirmLoading,
  getButtonLabel,
  onPresetPress,
  onConfirm,
  colors,
}) => {
  const [isSourcePickerOpen, setIsSourcePickerOpen] = useState(false);
  const { payToken, setPayToken } = useTransactionPayToken();
  const { availableTokens } = useTransactionPayAvailableTokens();

  const selectedToken = useMemo(
    () =>
      payToken
        ? availableTokens.find(
            (t) =>
              t.address?.toLowerCase() === payToken.address.toLowerCase() &&
              t.chainId === payToken.chainId,
          )
        : undefined,
    [payToken, availableTokens],
  );

  const handleSelect = useCallback(
    (token: AssetType) => {
      if (!token.address || !token.chainId) return;
      setPayToken({
        address: token.address as Hex,
        chainId: token.chainId as Hex,
      });
      setIsSourcePickerOpen(false);
    },
    [setPayToken],
  );

  const selectedSymbol = selectedToken?.symbol ?? '';
  const selectedChainId = selectedToken?.chainId ?? '';
  const selectedImage = selectedToken?.image;
  const selectedBalanceFiat =
    selectedToken?.fiat?.balance !== undefined
      ? `$${selectedToken.fiat.balance.toFixed(2)}`
      : undefined;

  return (
    <Box twClassName="w-full">
      {/* Preset pills */}
      <Box twClassName="pt-4 pb-6 px-4">
        <Box flexDirection={BoxFlexDirection.Row} gap={3}>
          {USD_PRESETS.map((preset) => (
            <Box key={preset} twClassName="flex-1">
              <Button
                variant={
                  usdAmount === preset
                    ? ButtonVariant.Primary
                    : ButtonVariant.Secondary
                }
                size={ButtonBaseSize.Md}
                onPress={() => onPresetPress(preset)}
                isFullWidth
                testID={`quick-buy-preset-${preset}`}
              >
                {`$${preset}`}
              </Button>
            </Box>
          ))}
        </Box>
      </Box>

      <Box twClassName="px-4 pb-6" gap={6}>
        <Box gap={4}>
          {/* Pay with row */}
          <TouchableOpacity
            onPress={() => setIsSourcePickerOpen((prev) => !prev)}
            disabled={availableTokens.length === 0}
            testID="quick-buy-pay-with-row"
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('social_leaderboard.quick_buy.pay_with')}
              </Text>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={2}
              >
                {selectedChainId ? (
                  <BadgeWrapper
                    badgePosition={BadgePosition.BottomRight}
                    badgeElement={
                      <BadgeNetwork
                        name={selectedSymbol}
                        imageSource={getNetworkImageSource({
                          chainId: selectedChainId,
                        })}
                      />
                    }
                  >
                    <AvatarToken
                      name={selectedSymbol}
                      src={selectedImage ? { uri: selectedImage } : undefined}
                      size={AvatarTokenSize.Xs}
                    />
                  </BadgeWrapper>
                ) : null}
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextDefault}
                >
                  {selectedSymbol}
                </Text>
                {selectedBalanceFiat && (
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    {`(${selectedBalanceFiat})`}
                  </Text>
                )}
                <Icon
                  name={
                    isSourcePickerOpen ? IconName.ArrowUp : IconName.ArrowDown
                  }
                  size={IconSize.Sm}
                  color={colors.icon.alternative}
                />
              </Box>
            </Box>
          </TouchableOpacity>

          {isSourcePickerOpen && (
            <SourceTokenPicker
              options={availableTokens}
              selectedAddress={payToken?.address}
              selectedChainId={payToken?.chainId}
              onSelect={handleSelect}
            />
          )}

          {/* Total row */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('social_leaderboard.quick_buy.total')}
              </Text>
              <Icon
                name={IconName.Info}
                size={IconSize.Sm}
                color={colors.icon.alternative}
              />
            </Box>
            <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
              {totalPayUsd
                ? `$${parseFloat(totalPayUsd).toFixed(2)}`
                : `$${usdAmount || '0'}`}
            </Text>
          </Box>
        </Box>

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonBaseSize.Lg}
          isFullWidth
          isDisabled={isConfirmDisabled}
          isLoading={isConfirmLoading}
          onPress={onConfirm}
          testID="quick-buy-confirm-button"
        >
          {getButtonLabel()}
        </Button>
      </Box>
    </Box>
  );
};

export default QuickBuyFooter;
