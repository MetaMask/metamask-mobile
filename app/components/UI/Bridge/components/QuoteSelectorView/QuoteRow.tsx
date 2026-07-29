import React, { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Skeleton,
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
import { useDisplayCurrencyValue } from '../../hooks/useDisplayCurrencyValue';
import { useSelector } from 'react-redux';
import { selectDestToken } from '../../../../../core/redux/slices/bridge';
import { formatAmountWithLocaleSeparators } from '../../utils/formatAmountWithLocaleSeparators';
import { limitToMaximumDecimalPlaces } from '../../../../../util/number';

export interface QuoteRowProps {
  provider: {
    name: string;
  };
  isLowestCost?: boolean;
  formattedTotalCost: string;
  selected?: boolean;
  quoteRequestId: string;
  onPress: (quoteRequestId: string) => void;
  loading?: boolean;
  receiveAmount?: string;
}

export interface QuoteRowViewProps extends Omit<QuoteRowProps, 'provider'> {
  providerName: string;
  formattedReceiveAmountFiat: string;
  destTokenSymbol?: string;
}

export const QuoteRowView = React.memo(
  ({
    selected,
    providerName,
    isLowestCost,
    formattedTotalCost,
    formattedReceiveAmountFiat,
    destTokenSymbol,
    onPress,
    quoteRequestId,
    loading,
    receiveAmount,
  }: QuoteRowViewProps) => {
    const theme = useTheme();
    const formattedReceiveAmount = useMemo(
      () =>
        receiveAmount && receiveAmount !== '0' && destTokenSymbol
          ? formatAmountWithLocaleSeparators(
              limitToMaximumDecimalPlaces(parseFloat(receiveAmount)),
            )
          : receiveAmount,
      [receiveAmount, destTokenSymbol],
    );

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
                    {providerName}
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
              <Text
                variant={TextVariantDS.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('bridge.total_cost')}: {formattedTotalCost}
              </Text>
            </Skeleton>
          </Box>
          <Box
            justifyContent={BoxJustifyContent.Center}
            alignItems={BoxAlignItems.End}
            gap={1}
          >
            <Skeleton hideChildren={loading}>
              <Text
                variant={TextVariantDS.BodyMd}
                fontWeight={FontWeight.Medium}
              >
                ~ {formattedReceiveAmount} {destTokenSymbol}
              </Text>
            </Skeleton>
            <Skeleton hideChildren={loading}>
              <Text
                variant={TextVariantDS.BodySm}
                color={TextColor.TextAlternative}
              >
                ~ {formattedReceiveAmountFiat}
              </Text>
            </Skeleton>
          </Box>
        </Box>
      </TouchableOpacity>
    );
  },
);

export const QuoteRow = ({ provider, ...props }: QuoteRowProps) => {
  const destToken = useSelector(selectDestToken);
  const formattedReceiveAmountFiat = useDisplayCurrencyValue(
    props.receiveAmount,
    destToken,
  );

  return (
    <QuoteRowView
      {...props}
      providerName={provider.name}
      formattedReceiveAmountFiat={formattedReceiveAmountFiat}
      destTokenSymbol={destToken?.symbol}
    />
  );
};
