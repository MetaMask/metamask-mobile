import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  ButtonBase,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { handleDeeplink } from '../../../../core/DeeplinkManager/Handlers/handleDeeplink';

const DEEP_LINKS = [
  ///////// UNIVERSAL LINKS /////////
  {
    title: 'Unsigned valid link = caution modal',
    url: 'https://link.metamask.io/perps',
    description: 'Unsigned valid link',
  },
  {
    title: 'Signed valid link = redirect modal to perps',
    url: 'https://link.metamask.io/perps?sig=ZEapBaui3fjBr-UtJT-pJNHNwgKBNPGBrrsP4dtJMVdqJzXLP2YIP_o94axxzT9x5m6D2xqGcPbZyXEMrFLvdQ',
    description: 'Signed valid link',
  },
  {
    title: 'Unsupported link',
    url: 'https://link.metamask.io/unsupported-link?sig=o_czwrx5C5w70E8TeFLNAfGxt6p3GI_YJYFoAzL7AHbKwjBGcmAlYU9a0YIRkkWgKUIyULtpTmGAWXOkWRVomQ',
    description: 'Unsupported link',
  },
  {
    title: 'Invalid link = no exist',
    url: 'https://link.metamask.io/invalid-link',
    description: 'Invalid link = unsigned and unsupported action',
  },
  ///////// DEEP LINKS /////////
  {
    id: 'unsigned-valid-deep',
    title: 'Unsigned valid deep link = deposit',
    url: 'metamask://deposit',
    description: 'Unsigned valid deep link',
  },
  {
    id: 'invalid-link-deep',
    title: 'Invalid deep link = do nothing',
    url: 'metamask://invalid-link',
    description: 'Invalid link = unsigned and unsupported action',
  },
  // Add more links here as needed
];

const DeepLinkTest = () => {
  const tw = useTailwind();

  const handleLinkPress = async (url: string, title: string) => {
    try {
      handleDeeplink({ uri: url });
    } catch (error) {
      console.error(`Error opening deep link ${title}:`, error);
    }
  };

  return (
    <Box twClassName="mb-6 mt-8" testID="deep-link-test-container">
      <Text variant={TextVariant.HeadingLg} twClassName="mb-2">
        Link Testing
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        twClassName="mb-4 text-text-alternative"
      >
        Test link handling and modals
      </Text>

      {DEEP_LINKS.map((link) => (
        <ButtonBase
          key={link.id}
          twClassName="mb-3 rounded-lg bg-background-alternative"
          style={({ pressed }) => tw.style('w-full', pressed && 'opacity-70')}
          onPress={() => handleLinkPress(link.url, link.title)}
          testID={link.id}
        >
          <Box
            flexDirection={BoxFlexDirection.Column}
            twClassName="items-start w-full gap-1 flex-1"
          >
            <Text
              variant={TextVariant.BodyMd}
              twClassName="mb-0.5 w-full"
              style={tw.style('font-medium')}
            >
              {link.title}
            </Text>
          </Box>
        </ButtonBase>
      ))}
    </Box>
  );
};

export default DeepLinkTest;
