import React from 'react';
import { Image, Pressable } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../../component-library/components/Icons/Icon';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../../component-library/components/Texts/SensitiveText';
import { TextVariant as ComponentTextVariant } from '../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../locales/i18n';
import { cardQueries } from '../../../queries';
import { selectIsCardAuthenticated } from '../../../../../../selectors/cardController';
import { CardType } from '../../../types';
import CardCashbackIllustration from '../../../../../../images/card-cashback-illustration.png';

const CURRENCY_DISPLAY_MAP: Record<string, string> = {
  musd: 'mUSD',
  usdc: 'USDC',
  usdt: 'USDT',
};

const formatCurrency = (raw: string): string =>
  CURRENCY_DISPLAY_MAP[raw.toLowerCase()] ?? raw.toUpperCase();

// Truncates to 4 decimals, strips trailing zero groups to mirror Cashback.tsx.
const formatAmount = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '0.00';
  const truncated = Math.floor(num * 10000) / 10000;
  return truncated.toFixed(2);
};

interface CardCashbackBannerProps {
  cardType: CardType | undefined;
  privacyMode: boolean;
  onPress: () => void;
}

const CardCashbackBanner = ({
  cardType,
  privacyMode,
  onPress,
}: CardCashbackBannerProps) => {
  const tw = useTailwind();
  const isAuthenticated = useSelector(selectIsCardAuthenticated);

  const { data: cashbackWallet, isLoading } = useQuery({
    ...cardQueries.cashback.walletOptions(),
    enabled: isAuthenticated,
  });

  const balance = cashbackWallet?.balance ?? '0';
  const currency = formatCurrency(cashbackWallet?.currency ?? 'musd');
  const displayAmount = `${formatAmount(balance)} ${currency}`;

  const labelKey =
    cardType === CardType.METAL
      ? 'card.card_home.cashback_banner.label_metal'
      : 'card.card_home.cashback_banner.label';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) =>
        tw.style(
          'mx-4 mt-6 rounded-3xl bg-background-muted p-4 flex-row items-center justify-between',
          pressed && 'bg-pressed',
        )
      }
    >
      <Box
        twClassName="flex-row items-center gap-3 flex-1"
        alignItems={BoxAlignItems.Center}
      >
        <Box
          twClassName="h-16 w-16 rounded-2xl overflow-hidden"
          style={tw.style('bg-accent04-normal')}
          alignItems={BoxAlignItems.Center}
        >
          <Image
            source={CardCashbackIllustration}
            style={tw.style('h-full w-full')}
            resizeMode="contain"
          />
        </Box>
        <Box twClassName="flex-1 gap-0.5">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings(labelKey)}
          </Text>
          {isLoading ? (
            <Skeleton height={28} width={120} style={tw.style('rounded-md')} />
          ) : (
            <SensitiveText
              isHidden={privacyMode}
              length={SensitiveTextLength.Medium}
              variant={ComponentTextVariant.HeadingLG}
            >
              {displayAmount}
            </SensitiveText>
          )}
        </Box>
      </Box>
      <Icon
        name={IconName.ArrowRight}
        size={IconSize.Md}
        color={IconColor.Default}
      />
    </Pressable>
  );
};

export default CardCashbackBanner;
