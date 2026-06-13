import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import AssetListControlBar from './AssetListControlBar';
import { ActivityScreenSelectorsIDs } from '../../ActivityScreen.testIds';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: () => ({}) }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { Text, TouchableOpacity } = jest.requireActual('react-native');

  return {
    ButtonBase: ({
      children,
      onPress,
      startIconProps,
      testID,
      textProps,
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      startIconProps?: object;
      testID?: string;
      textProps?: object;
    }) => (
      <TouchableOpacity
        accessibilityState={{
          selected: Boolean(startIconProps || textProps),
        }}
        onPress={onPress}
        testID={testID}
      >
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
    ButtonBaseSize: { Md: 'Md' },
    IconColor: { PrimaryDefault: 'PrimaryDefault' },
    IconName: { Customize: 'Customize', Filter: 'Filter' },
    TextColor: { PrimaryDefault: 'PrimaryDefault' },
  };
});

describe('AssetListControlBar', () => {
  it('renders filter labels and triggers both callbacks', () => {
    const onNetworkPress = jest.fn();
    const onTypePress = jest.fn();

    render(
      <AssetListControlBar
        networkLabel="Linea"
        isNetworkFilterActive
        onNetworkPress={onNetworkPress}
        typeLabel="Transactions"
        isTypeFilterActive={false}
        onTypePress={onTypePress}
      />,
    );

    const networkChip = screen.getByTestId(
      ActivityScreenSelectorsIDs.NETWORK_FILTER_CHIP,
    );
    const typeChip = screen.getByTestId(
      ActivityScreenSelectorsIDs.TYPE_FILTER_CHIP,
    );

    expect(screen.getByText('Linea')).toBeOnTheScreen();
    expect(screen.getByText('Transactions')).toBeOnTheScreen();
    expect(networkChip).toHaveProp('accessibilityState', { selected: true });
    expect(typeChip).toHaveProp('accessibilityState', { selected: false });

    fireEvent.press(networkChip);
    fireEvent.press(typeChip);

    expect(onNetworkPress).toHaveBeenCalledTimes(1);
    expect(onTypePress).toHaveBeenCalledTimes(1);
  });
});
