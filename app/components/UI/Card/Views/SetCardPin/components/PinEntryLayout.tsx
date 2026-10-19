import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import Keypad, { type KeypadChangeData } from '../../../../../Base/Keypad';
import {
  useCardHeaderHandlers,
  type CardHeaderMode,
} from '../../../hooks/useCardHeaderHandlers';
import PinDots from './PinDots';
import { SetCardPinSelectors } from '../SetCardPin.testIds';

interface PinEntryLayoutProps {
  testID?: string;
  title: string;
  description: string;
  accessibilityLabel: string;
  value: string;
  revealedIndex: number | null;
  isError: boolean;
  errorMessage: string | null;
  headerMode?: CardHeaderMode;
  onBackPress?: () => void;
  ctaLabel: string;
  ctaTestID: string;
  ctaDisabled: boolean;
  ctaLoading?: boolean;
  onCtaPress: () => void;
  keypadDisabled: boolean;
  onKeypadChange: (data: KeypadChangeData) => void;
}

const styles = StyleSheet.create({
  hiddenPeriod: {
    opacity: 0,
  },
  keypadDisabled: {
    opacity: 0.5,
  },
});

const PinEntryLayout: React.FC<PinEntryLayoutProps> = ({
  testID = SetCardPinSelectors.ROOT,
  title,
  description,
  accessibilityLabel,
  value,
  revealedIndex,
  isError,
  errorMessage,
  headerMode = 'back',
  onBackPress,
  ctaLabel,
  ctaTestID,
  ctaDisabled,
  ctaLoading = false,
  onCtaPress,
  keypadDisabled,
  onKeypadChange,
}) => {
  const tw = useTailwind();
  const headerHandlers = useCardHeaderHandlers(headerMode);
  const resolvedHeaderHandlers =
    headerMode === 'back' && onBackPress
      ? { ...headerHandlers, onBack: onBackPress }
      : headerHandlers;

  return (
    <SafeAreaView
      testID={testID}
      style={tw.style('flex-1 bg-background-default')}
      edges={['bottom']}
      accessibilityLabel={accessibilityLabel}
    >
      <HeaderStandard
        includesTopInset
        twClassName="bg-background-default"
        {...resolvedHeaderHandlers}
      />
      <Box twClassName="flex-1 px-4">
        <Box twClassName="gap-2 mt-2">
          <Text variant={TextVariant.HeadingLg} twClassName="text-default">
            {title}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-text-alternative"
          >
            {description}
          </Text>
        </Box>

        <Box
          twClassName="flex-1 mt-10"
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Start}
          gap={4}
        >
          <PinDots
            value={value}
            revealedIndex={revealedIndex}
            isError={isError}
          />
          {errorMessage ? (
            <Text
              variant={TextVariant.BodySm}
              testID={SetCardPinSelectors.INLINE_ERROR}
              twClassName="text-error-default text-center"
            >
              {errorMessage}
            </Text>
          ) : null}
        </Box>
      </Box>

      <Box twClassName="px-4 pb-2 gap-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={ctaDisabled}
          isLoading={ctaLoading}
          onPress={onCtaPress}
          testID={ctaTestID}
        >
          {ctaLabel}
        </Button>
        <Box
          pointerEvents={keypadDisabled ? 'none' : 'auto'}
          style={keypadDisabled ? styles.keypadDisabled : undefined}
        >
          <Keypad
            value={value || '0'}
            onChange={onKeypadChange}
            periodButtonProps={{
              isDisabled: true,
              style: styles.hiddenPeriod,
            }}
          />
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default PinEntryLayout;
