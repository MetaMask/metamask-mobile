import React from 'react';
import { Image } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import hand from './assets/hand.png';

const HAND_WIDTH = 240;
const HAND_ASPECT_RATIO = 720 / 531;

interface ApplePayHandGraphicProps {
  testID?: string;
  imageTestID?: string;
}

const ApplePayHandGraphic = ({
  testID,
  imageTestID,
}: ApplePayHandGraphicProps) => (
  <Box
    backgroundColor={BoxBackgroundColor.BackgroundSection}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.End}
    twClassName="h-[209px] w-full overflow-hidden rounded-[40px]"
    testID={testID}
  >
    <Image
      source={hand}
      resizeMode="contain"
      accessible={false}
      testID={imageTestID}
      style={{
        width: HAND_WIDTH,
        height: HAND_WIDTH / HAND_ASPECT_RATIO,
      }}
    />
  </Box>
);

export default ApplePayHandGraphic;
