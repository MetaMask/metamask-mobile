import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../util/theme';
import { CollectiblesCardsTestIds } from '../../Collectibles.testIds';
import { useFiatNormalizer } from '../../../../Views/Homepage/BalanceBreakdown/hooks/useFiatNormalizer';
import {
  getLocaleLanguageCode,
  useFormatters,
} from '../../../../hooks/useFormatters';
import ReplitCollectionAmount from '../CollectiblesMotion/ReplitCollectionAmount';
import { useCollectionTransfer } from './CollectionTransferProvider';

/** Keep the collection's source digit layout stable before, during and after an arrival. */
export default function CollectionValue({
  value,
  isActive,
}: {
  value: number;
  isActive: boolean;
}) {
  const { colors } = useTheme();
  const { toUserCurrency, userCurrency } = useFiatNormalizer();
  const { formatCurrency } = useFormatters();
  const locale = getLocaleLanguageCode();
  const { identity, arrivalValue } = useCollectionTransfer();
  const claimed = useRef<string | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [arrival, setArrival] = useState<{
    identity: string;
    from: number;
    to: number;
  }>();

  useEffect(() => {
    if (!isActive) {
      setArrival(undefined);
      return;
    }
    if (!identity || claimed.current === identity) return;
    claimed.current = identity;
    setArrival({
      identity,
      from: Math.max(0, value - arrivalValue),
      to: value,
    });
  }, [identity, arrivalValue, value, isActive]);

  // A subsequent holdings update wins over presentation of an earlier receipt.
  const activeArrival = arrival?.to === value ? arrival : undefined;
  const displayValue = toUserCurrency(value);
  const from = toUserCurrency(activeArrival?.from ?? value);
  const valueLabel =
    displayValue === undefined
      ? '—'
      : formatCurrency(displayValue, userCurrency);
  return (
    <Box
      accessible
      accessibilityLabel={valueLabel}
      accessibilityRole="text"
      testID={CollectiblesCardsTestIds.TOTAL_VALUE}
      twClassName="min-h-11"
    >
      {failed || displayValue === undefined || from === undefined ? (
        <Text variant={TextVariant.DisplayMd}>{valueLabel}</Text>
      ) : (
        <ReplitCollectionAmount
          identity={`${activeArrival?.identity ?? `collection-value-${value}`}:${userCurrency}:${locale}`}
          from={from}
          to={displayValue}
          currency={userCurrency}
          locale={locale}
          textColor={colors.text.default}
          isActive={isActive}
          onError={() => setFailed(true)}
          onComplete={() => {
            const completedIdentity = activeArrival?.identity;
            if (completedIdentity)
              setArrival((current) =>
                current?.identity === completedIdentity ? undefined : current,
              );
          }}
        />
      )}
    </Box>
  );
}
