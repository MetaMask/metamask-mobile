import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { SocialTabSelectorsIDs } from './SocialTab.testIds';

/**
 * Social tab — intentionally a blank slate.
 *
 * Placeholder for information-architecture exploration: it occupies the tab
 * slot previously held by Money so the bar can be evaluated with a Social
 * destination present, without yet committing to any content. Build the real
 * surface out from here.
 */
const SocialTab = () => {
  const tw = useTailwind();

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={SocialTabSelectorsIDs.CONTAINER}
    >
      <Box
        twClassName="flex-1 px-4"
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
      >
        <Text variant={TextVariant.HeadingLg} color={TextColor.TextDefault}>
          {'Social'}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          style={tw.style('mt-2 text-center')}
        >
          {'Blank slate — nothing here yet.'}
        </Text>
      </Box>
    </SafeAreaView>
  );
};

export default SocialTab;
