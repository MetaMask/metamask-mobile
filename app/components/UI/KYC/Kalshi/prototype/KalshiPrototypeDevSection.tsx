// PROTOTYPE-DO-NOT-MERGE
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { PROTOTYPE_COPY } from './prototypeConstants';
import { KalshiPrototypeDevSectionSelectorsIDs } from './KalshiPrototypeDevSection.testIds';

/**
 * The Developer Options entry for the Kalshi onboarding prototype: one
 * button that opens the prototype's own settings screen, where the
 * scenarios, review resolver, failure switches and reset live.
 *
 * @returns The section, or `null` outside development builds.
 */
const KalshiPrototypeDeveloperOptionsSection = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const copy = PROTOTYPE_COPY.devOptions;

  if (!__DEV__) {
    return null;
  }

  return (
    <Box
      twClassName="gap-3 pt-6 pb-6"
      testID={KalshiPrototypeDevSectionSelectorsIDs.SECTION}
    >
      <Text variant={TextVariant.HeadingLg} color={TextColor.TextDefault}>
        {copy.title}
      </Text>
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {copy.description}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={() =>
          navigation.navigate(Routes.SETTINGS.KALSHI_PROTOTYPE_SETTINGS)
        }
        testID={KalshiPrototypeDevSectionSelectorsIDs.OPEN}
      >
        {copy.open}
      </Button>
    </Box>
  );
};

export default KalshiPrototypeDeveloperOptionsSection;
