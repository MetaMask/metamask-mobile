// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import ScrollableTabView from '@tommasini/react-native-scrollable-tab-view';

// External dependencies.
import TextComponent from '../../components/Texts/Text';

// Internal dependencies.
import { default as TabBarComponent } from './TabBar';

const TabBarStoryMeta = {
  title: 'Components Temp / TabBar',
  component: TabBarComponent,
};

export default TabBarStoryMeta;

const containerStyle = {
  flex: 1,
  padding: 16,
};

const tabContentStyle = {
  flex: 1,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  paddingTop: 20,
};

interface TabViewProps {
  tabLabel: string;
}

export const Default = () => (
  <View style={containerStyle}>
    <ScrollableTabView
      renderTabBar={(props) => <TabBarComponent {...props} />}
      initialPage={0}
    >
      <View
        key="tokens"
        style={tabContentStyle}
        {...({ tabLabel: 'Tokens' } as TabViewProps)}
      >
        <TextComponent>Tokens Content</TextComponent>
      </View>
      <View
        key="nfts"
        style={tabContentStyle}
        {...({ tabLabel: 'NFTs' } as TabViewProps)}
      >
        <TextComponent>NFTs Content</TextComponent>
      </View>
      <View
        key="defi"
        style={tabContentStyle}
        {...({ tabLabel: 'DeFi' } as TabViewProps)}
      >
        <TextComponent>DeFi Content</TextComponent>
      </View>
    </ScrollableTabView>
  </View>
);
