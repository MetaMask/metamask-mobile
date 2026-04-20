import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import Icon, {
  IconSize,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import BadgeNetwork from '../../../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';
import { getNetworkImageSource } from '../../../../../../util/networks';
import type { AssetType } from '../../../../confirmations/types/token';
import { useTheme } from '../../../../../../util/theme';

interface SourceTokenPickerProps {
  options: AssetType[];
  selectedAddress: string | undefined;
  selectedChainId: string | undefined;
  onSelect: (token: AssetType) => void;
}

export const getAssetKey = (token: AssetType): string =>
  `${token.address?.toLowerCase() ?? ''}:${token.chainId ?? ''}`;

/**
 * Inline dropdown list of Pay-eligible source tokens.
 */
const SourceTokenPicker: React.FC<SourceTokenPickerProps> = ({
  options,
  selectedAddress,
  selectedChainId,
  onSelect,
}) => {
  const { colors } = useTheme();
  const selectedKey =
    selectedAddress && selectedChainId
      ? `${selectedAddress.toLowerCase()}:${selectedChainId}`
      : undefined;

  const handleSelect = useCallback(
    (token: AssetType) => {
      onSelect(token);
    },
    [onSelect],
  );

  return (
    <Box twClassName="pb-2">
      {options.map((item) => {
        const key = getAssetKey(item);
        const isSelected = key === selectedKey;
        const fiatBalance = item.fiat?.balance;
        const balanceFiat =
          fiatBalance !== undefined ? `$${fiatBalance.toFixed(2)}` : undefined;

        return (
          <TouchableOpacity
            key={key}
            onPress={() => handleSelect(item)}
            testID={`source-token-option-${item.symbol}-${item.chainId}`}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              twClassName="px-4 py-2"
              style={
                isSelected
                  ? { backgroundColor: colors.background.pressed }
                  : undefined
              }
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={3}
              >
                {item.chainId ? (
                  <BadgeWrapper
                    badgePosition={BadgePosition.BottomRight}
                    badgeElement={
                      <BadgeNetwork
                        name={item.symbol ?? ''}
                        imageSource={getNetworkImageSource({
                          chainId: item.chainId,
                        })}
                      />
                    }
                  >
                    <AvatarToken
                      name={item.symbol ?? ''}
                      src={item.image ? { uri: item.image } : undefined}
                      size={AvatarTokenSize.Sm}
                    />
                  </BadgeWrapper>
                ) : (
                  <AvatarToken
                    name={item.symbol ?? ''}
                    src={item.image ? { uri: item.image } : undefined}
                    size={AvatarTokenSize.Sm}
                  />
                )}
                <Box>
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextDefault}
                  >
                    {item.symbol}
                  </Text>
                  {item.name && (
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      {item.name}
                    </Text>
                  )}
                </Box>
              </Box>

              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={2}
              >
                <Box alignItems={BoxAlignItems.End}>
                  {balanceFiat && (
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                      color={TextColor.TextDefault}
                    >
                      {balanceFiat}
                    </Text>
                  )}
                </Box>
                {isSelected && (
                  <Icon
                    name={IconName.Check}
                    size={IconSize.Sm}
                    color={colors.primary.default}
                  />
                )}
              </Box>
            </Box>
          </TouchableOpacity>
        );
      })}
    </Box>
  );
};

export default SourceTokenPicker;
