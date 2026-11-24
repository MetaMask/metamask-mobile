// PROTOTYPE-DO-NOT-MERGE
import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { PROTOTYPE_COPY } from './prototypeConstants';
import { KalshiPrototypeSumsubSelectorsIDs } from './KalshiPrototypeSumsub.testIds';

interface KalshiPrototypeSumsubScreenProps {
  /** Ends the Sumsub presentation the way finishing the SDK would. */
  onContinue: () => void;
}

/**
 * What the SumSub SDK presentation is replaced with in the prototype: a mock
 * view whose Continue ends the identity-provider flow. The Continue button
 * sits pinned at the bottom, like the SDK's own footer.
 *
 * @param props - The continue handler.
 * @returns The screen.
 */
const KalshiPrototypeSumsubScreen = ({
  onContinue,
}: KalshiPrototypeSumsubScreenProps) => {
  const tw = useTailwind();
  const copy = PROTOTYPE_COPY.sumsub;

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={KalshiPrototypeSumsubSelectorsIDs.CONTAINER}
    >
      <ScrollView
        contentContainerStyle={tw.style('flex-grow justify-center px-4')}
      >
        <Text variant={TextVariant.HeadingLg} twClassName="text-center">
          {copy.title}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2 text-center"
        >
          {copy.body}
        </Text>
      </ScrollView>
      <Box twClassName="p-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={onContinue}
          testID={KalshiPrototypeSumsubSelectorsIDs.CONTINUE_BUTTON}
        >
          {copy.continue}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default KalshiPrototypeSumsubScreen;
