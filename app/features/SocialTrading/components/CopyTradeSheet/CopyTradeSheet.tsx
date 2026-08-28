import React, { useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import {
  AvatarToken,
  AvatarTokenSize,
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  type BottomSheetRef,
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonsAlignment,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import { useAnalytics } from '../../../../components/hooks/useAnalytics/useAnalytics';
import { SOCIAL_TRADING_EVENTS } from '../../analytics/events';
import { useSocialTrading } from '../../context/SocialTradingContext';
import { formatUsd, getTrader, Trade } from '../../data/mockData';

const PRESET_AMOUNTS_USD = [50, 100, 250, 500];
const DONE_DISMISS_DELAY_MS = 1100;

interface CopyTradeSheetProps {
  trade: Trade;
  onClose: () => void;
}

/**
 * Simulated copy-trade sheet. Confirming records a local mock position via
 * SocialTradingContext. No transaction is created, nothing is signed, and
 * no funds move.
 */
export function CopyTradeSheet({ trade, onClose }: CopyTradeSheetProps) {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { copyTrade } = useSocialTrading();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [amount, setAmount] = useState<number>(100);
  const [done, setDone] = useState<boolean>(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trader = getTrader(trade.traderId);
  const isBuy = trade.side === 'buy';

  useEffect(
    () => () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    },
    [],
  );

  const handleConfirm = () => {
    copyTrade(trade, amount);
    trackEvent(
      createEventBuilder(SOCIAL_TRADING_EVENTS.TRADE_COPY_SIMULATED)
        .addProperties({
          trade_id: trade.id,
          trader_id: trade.traderId,
          token_symbol: trade.tokenSymbol,
          amount_usd: amount,
          simulated: true,
        })
        .build(),
    );
    setDone(true);
    dismissTimer.current = setTimeout(() => {
      sheetRef.current?.onCloseBottomSheet(onClose);
    }, DONE_DISMISS_DELAY_MS);
  };

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={onClose}
      testID="social-trading-copy-trade-sheet"
    >
      {done ? (
        <Box
          alignItems={BoxAlignItems.Center}
          paddingVertical={8}
          paddingHorizontal={4}
          gap={3}
        >
          <Box
            backgroundColor={BoxBackgroundColor.SuccessMuted}
            twClassName="rounded-full"
            padding={4}
          >
            <Icon
              name={IconName.Confirmation}
              size={IconSize.Xl}
              color={IconColor.SuccessDefault}
            />
          </Box>
          <Text variant={TextVariant.HeadingMd}>
            {strings('social_trading.sheet.done_title')}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('social_trading.sheet.done_description', {
              amount: formatUsd(amount),
              trader: trader?.name ?? strings('social_trading.sheet.a_trader'),
              symbol: trade.tokenSymbol,
            })}
          </Text>
        </Box>
      ) : (
        <>
          <BottomSheetHeader
            onClose={() => sheetRef.current?.onCloseBottomSheet(onClose)}
          >
            {strings('social_trading.sheet.title')}
          </BottomSheetHeader>
          <Box paddingHorizontal={4} paddingBottom={2} gap={4}>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              backgroundColor={BoxBackgroundColor.BackgroundMuted}
              twClassName="rounded-xl"
              padding={3}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={3}
              >
                <AvatarToken
                  name={trade.tokenName}
                  fallbackText={trade.tokenSymbol.slice(0, 1)}
                  size={AvatarTokenSize.Md}
                />
                <Box>
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                  >
                    {trade.tokenSymbol} · {formatUsd(trade.price)}
                  </Text>
                  <Text
                    variant={TextVariant.BodyXs}
                    color={TextColor.TextAlternative}
                  >
                    {strings('social_trading.sheet.by_trader', {
                      name:
                        trader?.name ??
                        strings('social_trading.sheet.a_trader'),
                      handle: trader?.handle ?? '',
                    })}
                  </Text>
                </Box>
              </Box>
              <Tag severity={isBuy ? TagSeverity.Success : TagSeverity.Danger}>
                {isBuy
                  ? strings('social_trading.trade.buy')
                  : strings('social_trading.trade.sell')}
              </Tag>
            </Box>

            <Box gap={2}>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                {strings('social_trading.sheet.amount_label')}
              </Text>
              <Box flexDirection={BoxFlexDirection.Row} gap={2}>
                {PRESET_AMOUNTS_USD.map((preset) => {
                  const active = amount === preset;
                  return (
                    <Pressable
                      key={preset}
                      onPress={() => setAmount(preset)}
                      accessibilityRole="button"
                      accessibilityLabel={`$${preset}`}
                      accessibilityState={{ selected: active }}
                      style={{ flex: 1 }}
                      testID={`social-trading-copy-amount-${preset}`}
                    >
                      <Box
                        backgroundColor={
                          active
                            ? BoxBackgroundColor.PrimaryMuted
                            : BoxBackgroundColor.BackgroundMuted
                        }
                        twClassName={
                          active
                            ? 'rounded-xl border border-primary-default'
                            : 'rounded-xl'
                        }
                        alignItems={BoxAlignItems.Center}
                        paddingVertical={3}
                      >
                        <Text
                          variant={TextVariant.BodyMd}
                          fontWeight={FontWeight.Medium}
                          color={
                            active
                              ? TextColor.PrimaryDefault
                              : TextColor.TextDefault
                          }
                        >
                          ${preset}
                        </Text>
                      </Box>
                    </Pressable>
                  );
                })}
              </Box>
            </Box>

            <Box
              flexDirection={BoxFlexDirection.Row}
              justifyContent={BoxJustifyContent.Between}
            >
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('social_trading.sheet.est_entry')}
              </Text>
              <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
                {strings('social_trading.sheet.est_entry_value', {
                  price: formatUsd(trade.price),
                  symbol: trade.tokenSymbol,
                })}
              </Text>
            </Box>

            <Text variant={TextVariant.BodyXs} color={TextColor.TextMuted}>
              {strings('social_trading.sheet.simulation_notice')}
            </Text>
          </Box>
          <BottomSheetFooter
            buttonsAlignment={ButtonsAlignment.Vertical}
            twClassName="px-4 pb-4"
            primaryButtonProps={{
              children: strings('social_trading.sheet.confirm', {
                amount: `$${amount}`,
              }),
              onPress: handleConfirm,
              testID: 'social-trading-confirm-copy-trade',
            }}
          />
        </>
      )}
    </BottomSheet>
  );
}

export default CopyTradeSheet;
