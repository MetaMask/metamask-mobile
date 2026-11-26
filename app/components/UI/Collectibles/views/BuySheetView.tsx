import React, { useRef, useState } from 'react';
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
import { View } from '../../primitives/View';
import { useHomePacks } from '../hooks/useHomePacks';
import { mockMaxPackQuantity, mockPayToken } from '../mocks/buySheet';
import { collectiblesTestIds } from '../Collectibles.testIds';

const quantityOptions = ['1', '5', '10'];
const maxOption = 'max';

interface Props {
  packCode: string;
  onDismiss: () => void;
}

export function BuySheetView({ packCode, onDismiss }: Props) {
  const sheetRef = useRef<BottomSheetRef>(null);

  const { data: packs } = useHomePacks();
  const pack = packs?.find(({ code }) => code === packCode);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={onDismiss}
      testID={collectiblesTestIds.buySheet}
    >
      <BottomSheetHeader
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
        closeButtonProps={{ testID: collectiblesTestIds.buySheetClose }}
      >
        {pack?.name ?? strings('collectibles.title')}
      </BottomSheetHeader>
      {pack && <BuySheetForm priceUsd={pack.priceUsd} />}
    </BottomSheet>
  );
}

interface FormProps {
  priceUsd: number;
}

function BuySheetForm({ priceUsd }: FormProps) {
  const { formatCurrency } = useFormatters();

  const [selectedOption, setSelectedOption] = useState(quantityOptions[0]);
  const { value: isAutoBuybackOn, setValue: setIsAutoBuybackOn } = useBoolean();
  const { value: isSkipRevealsOn, setValue: setIsSkipRevealsOn } = useBoolean();

  const quantity =
    selectedOption === maxOption ? mockMaxPackQuantity : Number(selectedOption);
  const total = formatCurrency(priceUsd * quantity, 'USD');

  return (
    <View className="gap-6 px-4 pb-4">
      <View className="items-center gap-1">
        <Text
          variant={TextVariant.AmountDisplayLg}
          testID={collectiblesTestIds.buySheetAmount}
        >
          {total}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('collectibles.buy_sheet.pack_count', { count: quantity })}
        </Text>
      </View>

      <FilterButtonGroup
        value={selectedOption}
        onChange={setSelectedOption}
        twClassName="gap-2"
        accessibilityLabel={strings('collectibles.buy_sheet.quantity')}
      >
        {quantityOptions.map((option) => (
          <FilterButton
            key={option}
            value={option}
            accessibilityState={{ selected: selectedOption === option }}
            testID={collectiblesTestIds.buySheetQuantity(option)}
          >
            {strings('collectibles.buy_sheet.pack_count', {
              count: Number(option),
            })}
          </FilterButton>
        ))}
        <FilterButton
          value={maxOption}
          accessibilityState={{ selected: selectedOption === maxOption }}
          testID={collectiblesTestIds.buySheetQuantity(maxOption)}
        >
          {strings('collectibles.buy_sheet.max')}
        </FilterButton>
      </FilterButtonGroup>

      <View className="gap-4">
        <Switch
          label={strings('collectibles.buy_sheet.auto_buyback')}
          isOn={isAutoBuybackOn}
          onValueChange={setIsAutoBuybackOn}
          testID={collectiblesTestIds.buySheetAutoBuyback}
        />
        <Switch
          label={strings('collectibles.buy_sheet.skip_reveals')}
          isOn={isSkipRevealsOn}
          onValueChange={setIsSkipRevealsOn}
          testID={collectiblesTestIds.buySheetSkipReveals}
        />
      </View>

      <View className="gap-3">
        <View
          className="flex-row items-center justify-between"
          testID={collectiblesTestIds.buySheetPayWith}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('collectibles.buy_sheet.pay_with')}
          </Text>
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
        </View>

        <View className="flex-row items-center justify-between">
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('collectibles.buy_sheet.total')}
          </Text>
          <View className="flex-row items-center gap-2">
            <Tag severity={TagSeverity.Success}>
              {strings('collectibles.buy_sheet.no_fees')}
            </Tag>
            <Text
              variant={TextVariant.BodyMd}
              testID={collectiblesTestIds.buySheetTotal}
            >
              {total}
            </Text>
          </View>
        </View>
      </View>

      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        testID={collectiblesTestIds.buySheetSubmit}
      >
        {strings('collectibles.buy_sheet.open_packs', { count: quantity })}
      </Button>
    </View>
  );
}
