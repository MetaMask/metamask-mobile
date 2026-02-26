import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant as TextVariantDS,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import TagBase, {
  TagSeverity,
  TagShape,
} from '../../../../../component-library/base-components/TagBase';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import { useShouldRenderGasSponsoredBanner } from '../../hooks/useShouldRenderGasSponsoredBanner';

export interface QuoteRowProps {
  provider: {
    name: string;
  };
  isLowestCost?: boolean;
  formattedNetworkFee?: string;
  isGasless?: boolean;
  quoteGasSponsored?: boolean;
  formattedTotalCost: string;
  selected?: boolean;
  quoteRequestId: string;
  onPress: (quoteRequestId: string) => void;
  loading?: boolean;
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
}

export const QuoteRow = ({
  selected,
  provider,
  formattedNetworkFee,
  quoteGasSponsored,
  isGasless,
  isLowestCost,
  formattedTotalCost,
  onPress,
  quoteRequestId,
  loading,
  latestSourceBalance,
}: QuoteRowProps) => {
  const tw = useTailwind();
  const theme = useTheme();

  const shouldShowGasSponsored = useShouldRenderGasSponsoredBanner({
    latestSourceBalance,
    quoteGasSponsored,
  });

  return (
    <TouchableOpacity onPress={() => onPress(quoteRequestId)}>
      <Box
        paddingVertical={3}
        paddingHorizontal={4}
        backgroundColor={
          selected
            ? BoxBackgroundColor.BackgroundMuted
            : BoxBackgroundColor.BackgroundDefault
        }
        gap={2}
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        alignItems={BoxAlignItems.Center}
      >
        <Box gap={1}>
          <Box
            gap={1}
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
          >
            <Skeleton hideChildren={loading}>
              <View>
                <Text
                  fontWeight={FontWeight.Medium}
                  variant={TextVariantDS.BodyMd}
                >
                  {provider.name}
                </Text>
              </View>
            </Skeleton>
            <View>
              {isLowestCost && !loading && (
                <TagBase
                  shape={TagShape.Rectangle}
                  textProps={{
                    variant: TextVariant.BodySM,
                    style: { fontWeight: 500 },
                    color: theme.colors.success.default,
                  }}
                  severity={TagSeverity.Success}
                >
                  {strings('bridge.lowest_cost')}
                </TagBase>
              )}
            </View>
          </Box>
          <Skeleton hideChildren={loading}>
            {shouldShowGasSponsored ? (
              <Text
                variant={TextVariantDS.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('bridge.gas_fees_sponsored')}
              </Text>
            ) : isGasless ? (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={1}
              >
                <Text
                  variant={TextVariantDS.BodySm}
                  style={tw`line-through`}
                  color={TextColor.TextAlternative}
                >
                  {formattedNetworkFee}
                </Text>
                <Text
                  variant={TextVariantDS.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings('bridge.included')}
                </Text>
              </Box>
            ) : (
              <Box
                gap={1}
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
              >
                <View>
                  <Icon
                    name={IconName.Gas}
                    size={IconSize.Sm}
                    color={IconColor.IconAlternative}
                  />
                </View>
                <View>
                  <Text
                    variant={TextVariantDS.BodySm}
                    color={TextColor.TextAlternative}
                  >
                    {formattedNetworkFee}
                  </Text>
                </View>
              </Box>
            )}
          </Skeleton>
        </Box>
        <Box
          justifyContent={BoxJustifyContent.Center}
          alignItems={BoxAlignItems.Center}
        >
          <Skeleton hideChildren={loading}>
            <Text variant={TextVariantDS.BodyMd} fontWeight={FontWeight.Medium}>
              {formattedTotalCost}
            </Text>
          </Skeleton>
        </Box>
      </Box>
    </TouchableOpacity>
  );
};
