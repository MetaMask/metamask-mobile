import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Image } from 'expo-image';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarBase,
  AvatarBaseShape,
  AvatarBaseSize,
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonsAlignment,
  ButtonSize,
  Card,
  FontWeight,
  RadioButton,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { PerpsDefaultExchangeSheetSelectorsIDs } from './PerpsDefaultExchangeSheet.testIds';
import type {
  PerpsDefaultExchangeOption,
  PerpsDefaultExchangeSheetProps,
} from './PerpsDefaultExchangeSheet.types';

const ExchangeCard = ({
  option,
  isSelected,
  onPress,
}: {
  option: PerpsDefaultExchangeOption;
  isSelected: boolean;
  onPress: (optionId: string) => void;
}) => {
  const tw = useTailwind();

  return (
    <Card
      isInteractive
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={option.name}
      onPress={() => onPress(option.id)}
      testID={`${PerpsDefaultExchangeSheetSelectorsIDs.OPTION}-${option.id}`}
      twClassName={
        isSelected
          ? 'border border-default bg-muted'
          : 'border border-transparent bg-muted'
      }
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Start}
        gap={4}
      >
        <AvatarBase
          size={AvatarBaseSize.Lg}
          shape={AvatarBaseShape.Square}
          twClassName="rounded-xl"
          testID={`${PerpsDefaultExchangeSheetSelectorsIDs.OPTION}-${option.id}-logo`}
        >
          <Image
            source={option.logoSource}
            style={tw.style('h-full w-full')}
            contentFit="cover"
            accessible={false}
          />
        </AvatarBase>
        <Box twClassName="min-w-0 flex-1">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              numberOfLines={1}
              twClassName="shrink"
            >
              {option.name}
            </Text>
            <Tag severity={TagSeverity.Neutral} twClassName="shrink-0">
              {strings('perps.default_exchange.max_leverage', {
                leverage: option.maxLeverage,
              })}
            </Tag>
          </Box>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('perps.default_exchange.fees', {
              maker: option.makerFee,
              taker: option.takerFee,
            })}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('perps.default_exchange.open_interest', {
              amount: option.openInterest,
            })}
          </Text>
        </Box>
        <Box
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <RadioButton isChecked={isSelected} pointerEvents="none" />
        </Box>
      </Box>
    </Card>
  );
};

/**
 * Sheet for choosing the default perps exchange.
 * The choice stays in draft until Save.
 */
const PerpsDefaultExchangeSheet: React.FC<PerpsDefaultExchangeSheetProps> = ({
  isVisible,
  options,
  selectedOptionId,
  onClose,
  onSave,
  testID = PerpsDefaultExchangeSheetSelectorsIDs.CONTAINER,
  saveButtonBottomSpacing,
}) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [draftOptionId, setDraftOptionId] = useState(selectedOptionId);

  useEffect(() => {
    if (isVisible) {
      setDraftOptionId(selectedOptionId);
    }
  }, [isVisible, selectedOptionId]);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSave = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet(() => {
      onSave(draftOptionId);
    });
  }, [draftOptionId, onSave]);

  const primaryButtonProps = useMemo(
    () => ({
      children: strings('perps.default_exchange.save'),
      onPress: handleSave,
      isFullWidth: true,
      size: ButtonSize.Lg,
      testID: PerpsDefaultExchangeSheetSelectorsIDs.SAVE,
    }),
    [handleSave],
  );

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet ref={bottomSheetRef} onClose={onClose} testID={testID}>
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: PerpsDefaultExchangeSheetSelectorsIDs.CLOSE,
          accessibilityLabel: strings('navigation.close'),
        }}
        textProps={{
          testID: PerpsDefaultExchangeSheetSelectorsIDs.TITLE,
        }}
      >
        {strings('perps.default_exchange.title')}
      </BottomSheetHeader>
      <Box gap={4} paddingHorizontal={4} paddingBottom={3} twClassName="w-full">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={PerpsDefaultExchangeSheetSelectorsIDs.DESCRIPTION}
        >
          {strings('perps.default_exchange.description')}
        </Text>
        <Box gap={2} twClassName="w-full">
          {options.map((option) => (
            <ExchangeCard
              key={option.id}
              option={option}
              isSelected={draftOptionId === option.id}
              onPress={setDraftOptionId}
            />
          ))}
        </Box>
      </Box>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Vertical}
        primaryButtonProps={primaryButtonProps}
        twClassName="pt-2"
        style={
          saveButtonBottomSpacing === undefined
            ? undefined
            : { paddingBottom: saveButtonBottomSpacing }
        }
      />
    </BottomSheet>
  );
};

export default PerpsDefaultExchangeSheet;
