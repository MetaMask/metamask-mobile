import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import {
  BottomSheet,
  BottomSheetRef,
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  ListItemSelect,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { PerpsProviderType } from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import BottomSheetHeaderGlass from '../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import Engine from '../../../../../core/Engine';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { PROVIDER_CONFIG } from '../../constants/perpsConfig';
import { usePerpsMarkets } from '../../hooks/usePerpsMarkets';
import { PerpsDefaultExchangeSheetSelectorsIDs } from '../../Perps.testIds';
import { PROVIDER_DISPLAY_INFO } from '../PerpsProviderSelector/PerpsProviderSelector.constants';
import PerpsProviderLogos from '../PerpsProviderLogos';
import {
  formatExchangeFeeRate,
  PERPS_EXCHANGE_FEE_SYMBOL,
  PERPS_EXCHANGE_STAT_MISSING,
  summarizeExchangeMarkets,
} from '../../utils/defaultExchangeStats';

const EXCHANGES: PerpsProviderType[] = [
  PROVIDER_CONFIG.DefaultProvider,
  PROVIDER_CONFIG.LighterProvider,
];

interface FeeQuote {
  maker?: number;
  taker?: number;
}

export interface PerpsDefaultExchangeSheetProps {
  selectedProviderId: PerpsProviderType;
  onClose: () => void;
  onSave: (providerId: PerpsProviderType) => boolean;
}

const Stat = ({
  label,
  value,
  testID,
}: {
  label: string;
  value: string;
  testID: string;
}): React.JSX.Element => (
  <Box twClassName="min-w-[30%] flex-1">
    <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
      {label}
    </Text>
    <Text variant={TextVariant.BodyMd} testID={testID}>
      {value}
    </Text>
  </Box>
);

/**
 * Default-exchange picker. Stats and fees come from the live providers.
 * Saving reports the chosen venue; the caller persists it.
 */
const PerpsDefaultExchangeSheet: React.FC<PerpsDefaultExchangeSheetProps> = ({
  selectedProviderId,
  onClose,
  onSave,
}) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled);
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [pendingProviderId, setPendingProviderId] =
    useState(selectedProviderId);
  const [fees, setFees] = useState<
    Partial<Record<PerpsProviderType, FeeQuote>>
  >({});
  const { markets } = usePerpsMarkets({ fullCatalog: true });

  useEffect(() => {
    let cancelled = false;
    const loadFees = async (): Promise<void> => {
      const quotes = await Promise.all(
        EXCHANGES.map(async (providerId) => {
          try {
            const [maker, taker] = await Promise.all([
              Engine.context.PerpsController.calculateFees({
                orderType: 'market',
                symbol: PERPS_EXCHANGE_FEE_SYMBOL,
                providerId,
                isMaker: true,
              }),
              Engine.context.PerpsController.calculateFees({
                orderType: 'market',
                symbol: PERPS_EXCHANGE_FEE_SYMBOL,
                providerId,
                isMaker: false,
              }),
            ]);
            return [
              providerId,
              { maker: maker.feeRate, taker: taker.feeRate },
            ] as const;
          } catch {
            return [providerId, {}] as const;
          }
        }),
      );
      if (!cancelled) {
        setFees(
          Object.fromEntries(quotes) as Partial<
            Record<PerpsProviderType, FeeQuote>
          >,
        );
      }
    };
    loadFees().catch(() => undefined);
    return (): void => {
      cancelled = true;
    };
  }, []);

  const statsByProvider = useMemo(
    () =>
      Object.fromEntries(
        EXCHANGES.map((providerId) => [
          providerId,
          summarizeExchangeMarkets(markets, providerId),
        ]),
      ) as Record<
        PerpsProviderType,
        ReturnType<typeof summarizeExchangeMarkets>
      >,
    [markets],
  );

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSave = useCallback(() => {
    if (onSave(pendingProviderId)) {
      handleClose();
    }
  }, [handleClose, onSave, pendingProviderId]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      goBack={onClose}
      testID={PerpsDefaultExchangeSheetSelectorsIDs.SHEET}
    >
      <BottomSheetHeaderGlass
        isGlass={isGlassHeader}
        onClose={handleClose}
        closeButtonProps={{
          testID: PerpsDefaultExchangeSheetSelectorsIDs.CLOSE,
        }}
      >
        {strings('perps.settings.default_exchange')}
      </BottomSheetHeaderGlass>
      <ScrollView>
        <Box twClassName="px-4 pb-3">
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('perps.settings.default_exchange_description')}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            className="pt-3"
          >
            {strings('perps.settings.your_default')}
          </Text>
        </Box>
        {EXCHANGES.map((providerId) => {
          const stats = statsByProvider[providerId];
          const quote = fees[providerId];
          const feeLabel = strings('perps.settings.maker_taker', {
            maker: formatExchangeFeeRate(quote?.maker),
            taker: formatExchangeFeeRate(quote?.taker),
          });
          const isSelected = pendingProviderId === providerId;
          return (
            <Box key={providerId}>
              <ListItemSelect
                title={PROVIDER_DISPLAY_INFO[providerId].name}
                startAccessory={
                  <PerpsProviderLogos providerIds={[providerId]} size={32} />
                }
                isSelected={isSelected}
                showSelectedIcon
                onPress={() => setPendingProviderId(providerId)}
                testID={`${PerpsDefaultExchangeSheetSelectorsIDs.OPTION}-${providerId}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              />
              <Box
                flexDirection={BoxFlexDirection.Row}
                twClassName="flex-wrap gap-3 px-4 pb-4"
              >
                <Stat
                  label={strings('perps.settings.markets')}
                  value={String(stats.marketCount)}
                  testID={`${PerpsDefaultExchangeSheetSelectorsIDs.STAT}-${providerId}-markets`}
                />
                <Stat
                  label={strings('perps.settings.fee')}
                  value={quote ? feeLabel : PERPS_EXCHANGE_STAT_MISSING}
                  testID={`${PerpsDefaultExchangeSheetSelectorsIDs.STAT}-${providerId}-fee`}
                />
                <Stat
                  label={strings('perps.settings.max_leverage')}
                  value={stats.maxLeverage}
                  testID={`${PerpsDefaultExchangeSheetSelectorsIDs.STAT}-${providerId}-max-leverage`}
                />
                <Stat
                  label={strings('perps.settings.open_interest')}
                  value={stats.openInterest}
                  testID={`${PerpsDefaultExchangeSheetSelectorsIDs.STAT}-${providerId}-open-interest`}
                />
                <Stat
                  label={strings('perps.settings.volume_24h')}
                  value={stats.volume24h}
                  testID={`${PerpsDefaultExchangeSheetSelectorsIDs.STAT}-${providerId}-volume`}
                />
              </Box>
            </Box>
          );
        })}
      </ScrollView>
      <Box twClassName="px-4 pb-6">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleSave}
          testID={PerpsDefaultExchangeSheetSelectorsIDs.SAVE}
        >
          {strings('perps.settings.save')}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default PerpsDefaultExchangeSheet;
