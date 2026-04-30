import {
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { useTheme } from '../../../../../../util/theme';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import { getBridgeTokenImageSource } from './getBridgeTokenImageSource';
import { getTokenKey } from './sourceTokenCandidates';

interface SourceTokenPickerProps {
  options: BridgeToken[];
  selectedToken: BridgeToken | undefined;
  onSelect: (token: BridgeToken) => void;
}

/**
 * Inline dropdown list of source token options.
 * Renders directly inside the parent bottom sheet — no nested sheets.
 */
const SourceTokenPicker: React.FC<SourceTokenPickerProps> = ({
  options,
  selectedToken,
  onSelect,
}) => {
  const { colors } = useTheme();
  const selectedKey = selectedToken ? getTokenKey(selectedToken) : undefined;

  const handleSelect = useCallback(
    (token: BridgeToken) => {
      onSelect(token);
    },
    [onSelect],
  );

  return (
    <Box twClassName="pb-2">
      {options.map((item) => {
        const key = getTokenKey(item);
        const isSelected = key === selectedKey;

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
                <Box twClassName="pb-0.5">
                  <BadgeWrapper
                    position={BadgeWrapperPosition.BottomRight}
                    badge={
                      <BadgeNetwork
                        name={item.symbol}
                        src={getNetworkImageSource({
                          chainId: item.chainId,
                        })}
                        twClassName="scale-75"
                      />
                    }
                  >
                    <AvatarToken
                      name={item.symbol}
                      src={getBridgeTokenImageSource(item)}
                      size={AvatarTokenSize.Sm}
                    />
                  </BadgeWrapper>
                </Box>
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
                  {item.balanceFiat && (
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                      color={TextColor.TextDefault}
                    >
                      {item.balanceFiat}
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
