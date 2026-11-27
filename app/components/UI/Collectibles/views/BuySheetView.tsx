import React, { useReducer, useRef, useState, type ReactNode } from 'react';
import {
  AvatarToken,
  AvatarTokenSize,
  BottomSheet,
  BottomSheetHeader,
  Button,
  ButtonSize,
  ButtonVariant,
  FilterButton,
  FilterButtonGroup,
  Slider,
  Switch,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useBoolean } from '../../../hooks/useBoolean';
import { useFormatters } from '../../../hooks/useFormatters';
import { fireImpact, ImpactMoment } from '../../../../util/haptics';
import { View } from '../../primitives/View';
import { mockMaxPackQuantity, mockPayToken } from '../mocks/buySheet';
import { collectiblesTestIds } from '../Collectibles.testIds';

const quantityOptions = ['1', '5', '10'];
const maxOption = 'max';
const minPackQuantity = 1;

const toOption = (quantity: number) =>
  quantity === mockMaxPackQuantity ? maxOption : String(quantity);
const toQuantity = (option: string) =>
  option === maxOption ? mockMaxPackQuantity : Number(option);
const toTrackPercent = (quantity: number) =>
  ((quantity - minPackQuantity) / (mockMaxPackQuantity - minPackQuantity)) *
  100;
const playGrip = () => fireImpact(ImpactMoment.SliderGrip);
const playTick = () => fireImpact(ImpactMoment.SliderTick);

const sliderMarks = [...quantityOptions, maxOption].map((option) => ({
  step: toTrackPercent(toQuantity(option)),
  haptic: true,
}));

interface Props {
  name: string;
  priceUsd: number;
  onDismiss: () => void;
}

export function BuySheetView({ name, priceUsd, onDismiss }: Props) {
  const sheetRef = useRef<BottomSheetRef>(null);

  const { formatCurrency } = useFormatters();

  const [quantity, setQuantity] = useState(minPackQuantity);
  const { value: isAutoBuyback, setValue: setAutoBuyback } = useBoolean();
  const { value: isSkipReveals, setValue: setSkipReveals } = useBoolean();

  const [sliderKey, remountSlider] = useReducer((key: number) => key + 1, 0);

  const selectedOption = toOption(quantity);
  const total = formatCurrency(priceUsd * quantity, 'USD');

  function selectOption(option: string) {
    setQuantity(toQuantity(option));
    remountSlider();
  }

  return (
    <BottomSheet ref={sheetRef} goBack={onDismiss}>
      <BottomSheetHeader
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
        closeButtonProps={{ testID: collectiblesTestIds.buySheetClose }}
      >
        {name}
      </BottomSheetHeader>
      <View className="gap-6 px-4 pb-4">
        <View className="items-center gap-1">
          <Text variant={TextVariant.AmountDisplayLg}>{total}</Text>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('collectibles.buy_sheet.pack_count', { count: quantity })}
          </Text>
        </View>

        <Slider
          key={sliderKey}
          value={quantity}
          onValueChange={setQuantity}
          minimumValue={minPackQuantity}
          maximumValue={mockMaxPackQuantity}
          step={1}
          marks={sliderMarks}
          showRangeDots
          onGrip={playGrip}
          onMark={playTick}
          accessible
          accessibilityLabel={strings('collectibles.buy_sheet.quantity')}
        />

        <FilterButtonGroup
          value={selectedOption}
          onChange={selectOption}
          twClassName="gap-2"
          accessibilityLabel={strings('collectibles.buy_sheet.quantity')}
        >
          {quantityOptions.map((option) => (
            <FilterButton
              key={option}
              value={option}
              accessibilityState={{ selected: selectedOption === option }}
            >
              {strings('collectibles.buy_sheet.pack_count', {
                count: Number(option),
              })}
            </FilterButton>
          ))}
          <FilterButton
            value={maxOption}
            accessibilityState={{ selected: selectedOption === maxOption }}
          >
            {strings('collectibles.buy_sheet.max')}
          </FilterButton>
        </FilterButtonGroup>

        <View className="gap-2">
          <BuySheetRow label={strings('collectibles.buy_sheet.auto_buyback')}>
            <Switch
              isOn={isAutoBuyback}
              onValueChange={setAutoBuyback}
              accessibilityLabel={strings(
                'collectibles.buy_sheet.auto_buyback',
              )}
            />
          </BuySheetRow>
          <BuySheetRow label={strings('collectibles.buy_sheet.skip_reveals')}>
            <Switch
              isOn={isSkipReveals}
              onValueChange={setSkipReveals}
              accessibilityLabel={strings(
                'collectibles.buy_sheet.skip_reveals',
              )}
            />
          </BuySheetRow>
          <BuySheetRow label={strings('collectibles.buy_sheet.pay_with')}>
            <View className="flex-row items-center gap-2">
              <AvatarToken
                name={mockPayToken.symbol}
                src={{ uri: mockPayToken.iconUrl }}
                size={AvatarTokenSize.Xs}
              />
              <Text variant={TextVariant.BodyMd}>
                {strings('collectibles.buy_sheet.pay_with_balance', {
                  symbol: mockPayToken.symbol,
                  balance: formatCurrency(mockPayToken.balanceUsd, 'USD'),
                })}
              </Text>
            </View>
          </BuySheetRow>
          <BuySheetRow label={strings('collectibles.buy_sheet.total')}>
            <View className="flex-row items-center gap-2">
              <Tag severity={TagSeverity.Success}>
                {strings('collectibles.buy_sheet.no_fees')}
              </Tag>
              <Text variant={TextVariant.BodyMd}>{total}</Text>
            </View>
          </BuySheetRow>
        </View>

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
        >
          {strings('collectibles.buy_sheet.open_packs', { count: quantity })}
        </Button>
      </View>
    </BottomSheet>
  );
}

interface RowProps {
  label: string;
  children: ReactNode;
}

function BuySheetRow({ label, children }: RowProps) {
  return (
    <View className="h-10 flex-row items-center justify-between gap-4">
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {label}
      </Text>
      {children}
    </View>
  );
}
