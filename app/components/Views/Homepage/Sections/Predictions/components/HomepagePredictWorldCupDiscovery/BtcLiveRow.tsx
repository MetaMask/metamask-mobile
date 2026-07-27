import React, { useMemo } from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
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
import HomepagePredictDiscoveryLivePill from './HomepagePredictDiscoveryLivePill';

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
      <HomepagePredictDiscoveryLivePill value={countdown} />
      <Icon
        name={IconName.ArrowRight}
        size={IconSize.Sm}
        color={IconColor.IconAlternative}
      />
    </Pressable>
  );
};

export default BtcLiveRow;
