/* eslint-disable no-console */
import React from 'react';
import { ScrollView } from 'react-native';

import { Box, Text, TextVariant } from '@metamask/design-system-react-native';

import HeaderStandardAnimated from './HeaderStandardAnimated';
import useHeaderStandardAnimated from './useHeaderStandardAnimated';
import TitleStandard from '../TitleStandard';

const HeaderStandardAnimatedMeta = {
  title: 'Components Temp / HeaderStandardAnimated',
  component: HeaderStandardAnimated,
  argTypes: {
    title: {
      control: 'text',
    },
    subtitle: {
      control: 'text',
    },
    twClassName: {
      control: 'text',
    },
  },
};

export default HeaderStandardAnimatedMeta;

const SampleContent = ({ itemCount = 20 }: { itemCount?: number }) => (
  <>
    {Array.from({ length: itemCount }).map((_, index) => (
      <Box key={index} twClassName="p-4 mb-2 bg-muted rounded-lg mx-4">
        <Text variant={TextVariant.BodyMd}>Item {index + 1}</Text>
        <Text variant={TextVariant.BodySm}>
          This is sample content to demonstrate scrolling behavior.
        </Text>
      </Box>
    ))}
  </>
);

const DefaultStory = () => {
  const { scrollY, onScroll, setTitleSectionHeight, titleSectionHeightSv } =
    useHeaderStandardAnimated();

  return (
    <Box twClassName="flex-1 bg-default">
      <HeaderStandardAnimated
        scrollY={scrollY}
        titleSectionHeight={titleSectionHeightSv}
        title="Market"
        onBack={() => console.log('Back pressed')}
      />
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <Box
          onLayout={(e) => setTitleSectionHeight(e.nativeEvent.layout.height)}
        >
          <TitleStandard
            topLabel="Perps"
            title="ETH-PERP"
            twClassName="px-4 pt-1 pb-3"
          />
        </Box>
        <SampleContent />
      </ScrollView>
    </Box>
  );
};

const WithSubtitleStory = () => {
  const { scrollY, onScroll, setTitleSectionHeight, titleSectionHeightSv } =
    useHeaderStandardAnimated();

  return (
    <Box twClassName="flex-1 bg-default">
      <HeaderStandardAnimated
        scrollY={scrollY}
        titleSectionHeight={titleSectionHeightSv}
        title="Market"
        subtitle="Perpetual futures"
        onBack={() => console.log('Back pressed')}
      />
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <Box
          onLayout={(e) => setTitleSectionHeight(e.nativeEvent.layout.height)}
        >
          <TitleStandard
            topLabel="Perps"
            title="ETH-PERP"
            twClassName="px-4 pt-1 pb-3"
          />
        </Box>
        <SampleContent />
      </ScrollView>
    </Box>
  );
};

export const Default = {
  render: () => <DefaultStory />,
};

export const WithSubtitle = {
  render: () => <WithSubtitleStory />,
};
