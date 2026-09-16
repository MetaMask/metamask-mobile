import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ImageSourcePropType } from 'react-native';
import QuickBuyPayWithChainFilter from './QuickBuyPayWithChainFilter';
import type { ChainOption } from '../hooks/useChainDisplayInfos';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (...classes: (string | boolean | undefined)[]) => ({
      testStyle: classes.filter(Boolean).join(' '),
    }),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const React = require('react');
  const { View, Text, Pressable, ScrollView } = require('react-native');

  const FilterButtonGroupContext = React.createContext<{
    onChange?: (value: string) => void;
    value?: string;
  }>({});

  const FilterButtonGroup = ({
    children,
    value,
    onChange,
    testID,
  }: {
    children: React.ReactNode;
    value: string;
    onChange: (value: string) => void;
    testID?: string;
  }) => (
    <FilterButtonGroupContext.Provider value={{ value, onChange }}>
      <ScrollView testID={testID} horizontal>
        {children}
      </ScrollView>
    </FilterButtonGroupContext.Provider>
  );

  const FilterButton = ({
    children,
    value,
    testID,
    startAccessory,
  }: {
    children: React.ReactNode;
    value: string;
    testID?: string;
    startAccessory?: React.ReactNode;
  }) => {
    const ctx = React.useContext(FilterButtonGroupContext);
    return (
      <Pressable
        testID={testID}
        onPress={() => ctx.onChange?.(value)}
        accessibilityState={{ selected: ctx.value === value }}
      >
        <View>
          {startAccessory}
          <Text>{children}</Text>
        </View>
      </Pressable>
    );
  };

  return { FilterButtonGroup, FilterButton };
});

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

const mockImageSource = {
  uri: 'https://example.com/eth.png',
} as ImageSourcePropType;

const createChains = (): ChainOption[] => [
  { chainId: null, name: 'All', imageSource: undefined },
  {
    chainId: '0x1',
    name: 'Ethereum',
    imageSource: mockImageSource,
  },
  {
    chainId: '0x38',
    name: 'BNB Chain',
    imageSource: mockImageSource,
  },
];

describe('QuickBuyPayWithChainFilter', () => {
  const onSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the All pill and chain pills', () => {
    render(
      <QuickBuyPayWithChainFilter
        chains={createChains()}
        selectedChainId={null}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByTestId('quick-buy-chain-filter-all')).toBeOnTheScreen();
    expect(screen.getByTestId('quick-buy-chain-filter-0x1')).toBeOnTheScreen();
    expect(screen.getByTestId('quick-buy-chain-filter-0x38')).toBeOnTheScreen();
    expect(screen.getByText('All')).toBeOnTheScreen();
    expect(screen.getByText('Ethereum')).toBeOnTheScreen();
    expect(screen.getByText('BNB Chain')).toBeOnTheScreen();
  });

  it('calls onSelect with a chain id when a chain pill is pressed', () => {
    render(
      <QuickBuyPayWithChainFilter
        chains={createChains()}
        selectedChainId={null}
        onSelect={onSelect}
      />,
    );

    fireEvent.press(screen.getByTestId('quick-buy-chain-filter-0x1'));
    expect(onSelect).toHaveBeenCalledWith('0x1');
  });

  it('calls onSelect with null when the All pill is pressed', () => {
    render(
      <QuickBuyPayWithChainFilter
        chains={createChains()}
        selectedChainId="0x1"
        onSelect={onSelect}
      />,
    );

    fireEvent.press(screen.getByTestId('quick-buy-chain-filter-all'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('renders nothing when chains is empty', () => {
    const { toJSON } = render(
      <QuickBuyPayWithChainFilter
        chains={[]}
        selectedChainId={null}
        onSelect={onSelect}
      />,
    );

    expect(toJSON()).toBeNull();
  });
});
