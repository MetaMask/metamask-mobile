import React, { useMemo } from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { formatPrice } from '../../../../../../UI/Predict/utils/format';
import HomepagePredictDiscoveryMaterialGlyph from './HomepagePredictDiscoveryMaterialGlyph';

const formatBtc = (value: number | undefined) =>
  value === undefined || Number.isNaN(value)
    ? '\u2014'
    : formatPrice(value, { maximumDecimals: 0 });

interface BtcLiveRowProps {
  onPress: () => void;
  btcSpotUsd: number | undefined;
  priceToBeat: number | undefined;
  countdown: string;
}

/** Live BTC 5-minute up/down row (price + price-to-beat + countdown pill). */
const BtcLiveRow = ({
  onPress,
  btcSpotUsd,
  priceToBeat,
  countdown,
}: BtcLiveRowProps) => {
  const tw = useTailwind();
  const btcPriceLabel = useMemo(() => formatBtc(btcSpotUsd), [btcSpotUsd]);
  const priceToBeatLabel = useMemo(() => formatBtc(priceToBeat), [priceToBeat]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={tw.style(
        'w-full flex-row items-center self-stretch py-2 active:opacity-80',
      )}
      testID="homepage-predict-discovery-btc-row"
    >
      <Box twClassName="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <HomepagePredictDiscoveryMaterialGlyph name="currencyBitcoin" />
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Column}
        twClassName="min-w-0 flex-1 pl-4"
      >
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextDefault}
          numberOfLines={1}
        >
          {strings('predict.homepage_discovery.btc_title', {
            price: btcPriceLabel,
          })}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
          style={tw.style('mt-0.5')}
        >
          {strings('predict.homepage_discovery.btc_price_to_beat', {
            price: priceToBeatLabel,
          })}
        </Text>
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        backgroundColor={BoxBackgroundColor.BackgroundMuted}
        twClassName="mx-1 h-7 shrink-0 rounded-full px-2"
      >
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          backgroundColor={BoxBackgroundColor.SuccessMuted}
          twClassName="h-4 w-4 shrink-0 rounded-full"
        >
          <Box twClassName="h-2 w-2 rounded-full bg-success-default" />
        </Box>
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextDefault}
          style={tw.style('ml-2 font-medium')}
        >
          {strings('predict.homepage_discovery.btc_live')}
        </Text>
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.SuccessDefault}
          style={tw.style('ml-2 font-medium')}
        >
          {countdown}
        </Text>
      </Box>
      <Icon
        name={IconName.ArrowRight}
        size={IconSize.Sm}
        color={IconColor.IconAlternative}
      />
    </Pressable>
  );
};

export default BtcLiveRow;
