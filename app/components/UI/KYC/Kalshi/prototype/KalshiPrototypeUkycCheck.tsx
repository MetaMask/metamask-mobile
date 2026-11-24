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
import { KalshiPrototypeUkycCheckSelectorsIDs } from './KalshiPrototypeUkycCheck.testIds';

interface KalshiPrototypeUkycCheckProps {
  /** The user has completed UKYC before; the flow takes the catch-up path. */
  onAnswered: (hasCompletedUkyc: boolean) => void;
}

/**
 * The prototype's branch point, in place of what kyc-api would decide: whether
 * this user already completed UKYC. Yes walks the returning-user path to the
 * catch-up consent; No walks the new-user path. Prototype-only view.
 *
 * @param props - The answer handler.
 * @returns The screen.
 */
const KalshiPrototypeUkycCheck = ({
  onAnswered,
}: KalshiPrototypeUkycCheckProps) => {
  const tw = useTailwind();
  const copy = PROTOTYPE_COPY.ukycCheck;

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <ScrollView
        contentContainerStyle={tw.style('flex-grow justify-center px-4')}
        testID={KalshiPrototypeUkycCheckSelectorsIDs.CONTAINER}
      >
        <Box twClassName="gap-2">
          <Text variant={TextVariant.HeadingLg}>{copy.title}</Text>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {copy.body}
          </Text>
        </Box>
      </ScrollView>
      <Box twClassName="gap-2 p-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={() => onAnswered(true)}
          testID={KalshiPrototypeUkycCheckSelectorsIDs.YES_BUTTON}
        >
          {copy.yes}
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={() => onAnswered(false)}
          testID={KalshiPrototypeUkycCheckSelectorsIDs.NO_BUTTON}
        >
          {copy.no}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default KalshiPrototypeUkycCheck;
