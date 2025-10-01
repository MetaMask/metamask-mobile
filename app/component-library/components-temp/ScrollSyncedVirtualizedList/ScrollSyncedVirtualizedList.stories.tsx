import type { Meta, StoryObj } from '@storybook/react-native';
import React, { useState } from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, Button } from '@metamask/design-system-react-native';
import { ScrollSyncedVirtualizedList } from './ScrollSyncedVirtualizedList';

const meta: Meta<typeof ScrollSyncedVirtualizedList> = {
  title: 'Component Library / ScrollSyncedVirtualizedList',
  component: ScrollSyncedVirtualizedList,
  parameters: {
    docs: {
      description: {
        component: `
A virtualized list component that syncs with parent scroll position.

This component implements spacer-based virtualization, where only visible items
are rendered while invisible spacers maintain proper scroll physics and positioning.
It's designed to work within a parent ScrollView and responds to the parent's
scroll position to determine which items should be visible.

**Key Features:**
- Renders only visible items for performance
- Maintains proper scroll physics with spacers  
- Syncs with parent ScrollView scroll position
- Supports header, footer, and empty state components
- Fixed item height for predictable layout
        `,
      },
    },
  },
  argTypes: {
    data: {
      description: 'Array of data items to render',
      control: { type: 'object' },
    },
    itemHeight: {
      description: 'Fixed height of each item in pixels',
      control: { type: 'number', min: 20, max: 200, step: 4 },
    },
    parentScrollY: {
      description: 'Current scroll position of the parent ScrollView',
      control: { type: 'number', min: 0, max: 2000, step: 10 },
    },
    _parentViewportHeight: {
      description: 'Viewport height of the parent scroll container',
      control: { type: 'number', min: 200, max: 800, step: 50 },
    },
    testID: {
      description: 'Test ID for the container',
      control: { type: 'text' },
    },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

// Sample data for stories
const generateSampleData = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `item-${index}`,
    title: `Item ${index + 1}`,
    subtitle: `Subtitle for item ${index + 1}`,
    value: Math.floor(Math.random() * 1000),
    color: `hsl(${(index * 137.5) % 360}, 70%, 50%)`,
  }));

const sampleData = generateSampleData(100);

// Basic item renderer
const BasicItemRenderer = ({ item }: { item: (typeof sampleData)[0] }) => {
  const tw = useTailwind();
  return (
    <Box
      style={tw.style(
        'flex-row items-center justify-between px-4 py-3 border-b border-gray-200',
      )}
    >
      <View>
        <Text style={tw.style('text-base font-medium text-gray-900')}>
          {item.title}
        </Text>
        <Text style={tw.style('text-sm text-gray-500')}>{item.subtitle}</Text>
      </View>
      <View
        style={[
          tw.style('w-4 h-4 rounded-full'),
          { backgroundColor: item.color },
        ]}
      />
    </Box>
  );
};

// Rich item renderer with more complex layout
const RichItemRenderer = ({ item }: { item: (typeof sampleData)[0] }) => {
  const tw = useTailwind();
  return (
    <Box
      style={tw.style(
        'mx-4 my-2 p-4 bg-white rounded-lg shadow-sm border border-gray-100',
      )}
    >
      <View style={tw.style('flex-row items-center justify-between mb-2')}>
        <Text style={tw.style('text-lg font-semibold text-gray-900')}>
          {item.title}
        </Text>
        <View
          style={[
            tw.style('w-6 h-6 rounded-full'),
            { backgroundColor: item.color },
          ]}
        />
      </View>
      <Text style={tw.style('text-sm text-gray-600 mb-2')}>
        {item.subtitle}
      </Text>
      <View style={tw.style('flex-row justify-between items-center')}>
        <Text style={tw.style('text-xs text-gray-400')}>ID: {item.id}</Text>
        <Text style={tw.style('text-sm font-medium text-blue-600')}>
          ${item.value}
        </Text>
      </View>
    </Box>
  );
};

// Header component
const HeaderComponent = () => {
  const tw = useTailwind();
  return (
    <Box style={tw.style('p-4 bg-blue-50 border-b border-blue-200')}>
      <Text style={tw.style('text-lg font-semibold text-blue-900')}>
        List Header
      </Text>
      <Text style={tw.style('text-sm text-blue-700')}>
        This header is always visible at the top
      </Text>
    </Box>
  );
};

// Footer component
const FooterComponent = () => {
  const tw = useTailwind();
  return (
    <Box style={tw.style('p-4 bg-gray-50 border-t border-gray-200')}>
      <Text style={tw.style('text-center text-sm text-gray-600')}>
        End of list • {sampleData.length} items total
      </Text>
    </Box>
  );
};

// Empty state component
const EmptyComponent = () => {
  const tw = useTailwind();
  return (
    <Box style={tw.style('p-8 items-center')}>
      <Text style={tw.style('text-lg font-medium text-gray-900 mb-2')}>
        No items found
      </Text>
      <Text style={tw.style('text-sm text-gray-500 text-center')}>
        There are no items to display in this list
      </Text>
    </Box>
  );
};

// Interactive wrapper for scroll simulation
const InteractiveWrapper = ({ children, ...props }: any) => {
  const [scrollY, setScrollY] = useState(0);
  const tw = useTailwind();
  const screenHeight = Dimensions.get('window').height;

  return (
    <View style={tw.style('flex-1')}>
      <View style={tw.style('p-4 bg-gray-100 border-b border-gray-300')}>
        <Text style={tw.style('text-sm font-medium mb-2')}>
          Scroll Position: {scrollY}px
        </Text>
        <View style={tw.style('flex-row gap-2')}>
          <Button onPress={() => setScrollY(0)} variant="secondary" size="sm">
            Top
          </Button>
          <Button onPress={() => setScrollY(500)} variant="secondary" size="sm">
            Middle
          </Button>
          <Button
            onPress={() => setScrollY(1000)}
            variant="secondary"
            size="sm"
          >
            Bottom
          </Button>
        </View>
      </View>
      <ScrollView
        style={tw.style('flex-1')}
        onScroll={(event) => {
          setScrollY(event.nativeEvent.contentOffset.y);
        }}
        scrollEventThrottle={16}
      >
        {React.cloneElement(children, {
          ...props,
          parentScrollY: scrollY,
          _parentViewportHeight: screenHeight - 120, // Account for header
        })}
      </ScrollView>
    </View>
  );
};

export const Default: Story = {
  args: {
    data: sampleData,
    renderItem: BasicItemRenderer,
    itemHeight: 64,
    parentScrollY: 0,
    _parentViewportHeight: 400,
    keyExtractor: (item) => item.id,
    testID: 'default-list',
  },
  render: (args) => (
    <InteractiveWrapper>
      <ScrollSyncedVirtualizedList {...args} />
    </InteractiveWrapper>
  ),
};

export const WithHeaderAndFooter: Story = {
  args: {
    ...Default.args,
    ListHeaderComponent: HeaderComponent,
    ListFooterComponent: FooterComponent,
    testID: 'header-footer-list',
  },
  render: (args) => (
    <InteractiveWrapper>
      <ScrollSyncedVirtualizedList {...args} />
    </InteractiveWrapper>
  ),
};

export const RichItems: Story = {
  args: {
    ...Default.args,
    renderItem: RichItemRenderer,
    itemHeight: 120,
    testID: 'rich-items-list',
  },
  render: (args) => (
    <InteractiveWrapper>
      <ScrollSyncedVirtualizedList {...args} />
    </InteractiveWrapper>
  ),
};

export const EmptyState: Story = {
  args: {
    ...Default.args,
    data: [],
    ListEmptyComponent: EmptyComponent,
    testID: 'empty-list',
  },
  render: (args) => (
    <InteractiveWrapper>
      <ScrollSyncedVirtualizedList {...args} />
    </InteractiveWrapper>
  ),
};

export const LargeDataset: Story = {
  args: {
    ...Default.args,
    data: generateSampleData(1000),
    testID: 'large-dataset-list',
  },
  render: (args) => (
    <InteractiveWrapper>
      <ScrollSyncedVirtualizedList {...args} />
    </InteractiveWrapper>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates performance with a large dataset (1000 items). Only visible items are rendered.',
      },
    },
  },
};

export const SmallItems: Story = {
  args: {
    ...Default.args,
    itemHeight: 32,
    renderItem: ({ item }: { item: (typeof sampleData)[0] }) => {
      const tw = useTailwind();
      return (
        <Box
          style={tw.style(
            'flex-row items-center justify-between px-4 py-2 border-b border-gray-100',
          )}
        >
          <Text style={tw.style('text-sm text-gray-900')}>{item.title}</Text>
          <View
            style={[
              tw.style('w-3 h-3 rounded-full'),
              { backgroundColor: item.color },
            ]}
          />
        </Box>
      );
    },
    testID: 'small-items-list',
  },
  render: (args) => (
    <InteractiveWrapper>
      <ScrollSyncedVirtualizedList {...args} />
    </InteractiveWrapper>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates the component with smaller item heights (32px).',
      },
    },
  },
};

export const StaticScroll: Story = {
  args: {
    ...Default.args,
    parentScrollY: 500,
    testID: 'static-scroll-list',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows the list with a fixed scroll position to demonstrate virtualization.',
      },
    },
  },
};
