// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';

// Internal dependencies.
import TabsList from './TabsList';
import { TabViewProps } from './TabsList/TabsList.types';

const TabsStoryMeta = {
  title: 'Components Temp / Tabs',
  component: TabsList,
};

export default TabsStoryMeta;

const ExampleTabContent: React.FC<{ title: string; height?: number }> = ({
  title,
  height = 200,
}) => (
  <Box
    twClassName="flex-1 justify-center items-center p-4 bg-background-alternative"
    style={{ minHeight: height }}
  >
    <Text variant={TextVariant.HeadingMd}>{title} Content</Text>
    <Text variant={TextVariant.BodyMd} twClassName="mt-2 text-center">
      This is the content for the {title} tab. Each tab can have its own height.
    </Text>
  </Box>
);

export const Default = () => (
  <Box twClassName="flex-1 p-4 bg-background-default">
    <TabsList>
      <View key="tokens" {...({ tabLabel: 'Tokens' } as TabViewProps)}>
        <ExampleTabContent title="Tokens" height={300} />
      </View>
      <View key="nfts" {...({ tabLabel: 'NFTs' } as TabViewProps)}>
        <ExampleTabContent title="NFTs" height={150} />
      </View>
      <View key="defi" {...({ tabLabel: 'DeFi' } as TabViewProps)}>
        <ExampleTabContent title="DeFi" height={400} />
      </View>
    </TabsList>
  </Box>
);

export const ManyTabs = () => (
  <Box twClassName="flex-1 p-4 bg-background-default">
    <TabsList>
      <View key="tokens" {...({ tabLabel: 'Tokens' } as TabViewProps)}>
        <ExampleTabContent title="Tokens" />
      </View>
      <View key="nfts" {...({ tabLabel: 'NFTs' } as TabViewProps)}>
        <ExampleTabContent title="NFTs" />
      </View>
      <View key="defi" {...({ tabLabel: 'DeFi' } as TabViewProps)}>
        <ExampleTabContent title="DeFi" />
      </View>
      <View key="staking" {...({ tabLabel: 'Staking' } as TabViewProps)}>
        <ExampleTabContent title="Staking" />
      </View>
      <View key="portfolio" {...({ tabLabel: 'Portfolio' } as TabViewProps)}>
        <ExampleTabContent title="Portfolio" />
      </View>
      <View key="history" {...({ tabLabel: 'History' } as TabViewProps)}>
        <ExampleTabContent title="History" />
      </View>
      <View key="settings" {...({ tabLabel: 'Settings' } as TabViewProps)}>
        <ExampleTabContent title="Settings" />
      </View>
    </TabsList>
  </Box>
);

export const LockedTabs = () => (
  <Box twClassName="flex-1 p-4 bg-background-default">
    <TabsList locked initialPage={1}>
      <View key="disabled1" {...({ tabLabel: 'Disabled 1' } as TabViewProps)}>
        <ExampleTabContent title="Disabled 1" />
      </View>
      <View key="active" {...({ tabLabel: 'Active' } as TabViewProps)}>
        <ExampleTabContent title="Active" />
      </View>
      <View key="disabled2" {...({ tabLabel: 'Disabled 2' } as TabViewProps)}>
        <ExampleTabContent title="Disabled 2" />
      </View>
    </TabsList>
  </Box>
);

export const DifferentHeights = () => (
  <Box twClassName="flex-1 p-4 bg-background-default">
    <TabsList>
      <View key="short" {...({ tabLabel: 'Short' } as TabViewProps)}>
        <ExampleTabContent title="Short Content" height={100} />
      </View>
      <View key="medium" {...({ tabLabel: 'Medium' } as TabViewProps)}>
        <ExampleTabContent title="Medium Content" height={250} />
      </View>
      <View key="tall" {...({ tabLabel: 'Tall' } as TabViewProps)}>
        <ExampleTabContent title="Tall Content" height={500} />
      </View>
    </TabsList>
  </Box>
);
