import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from '@metamask/design-system-react-native';
import render from '#app/util/test/renderWithProvider';
import { collectiblesRoutes } from '#app/components/UI/Collectibles/routeNames';
import { PackDetailScreen } from '#app/components/UI/Collectibles/routes/PackDetailScreen';

jest.mock('#app/components/UI/Collectibles/views/PackDetailView', () => {
  const { Pressable } = jest.requireActual('react-native');
  return {
    PackDetailView: ({
      packCode,
      onOpenPack,
    }: {
      packCode: string;
      onOpenPack: (params: object) => void;
    }) => (
      <Pressable
        testID="mock-open"
        onPress={() => onOpenPack({ packCode, name: 'Lorem', priceUsd: 25 })}
      />
    ),
  };
});

const Stack = createNativeStackNavigator();

function BuySheetStub() {
  const { params } = useRoute();
  return <Text>{`buy sheet: ${JSON.stringify(params)}`}</Text>;
}

describe('PackDetailScreen', () => {
  it('opens the buy sheet for the pack', async () => {
    render(
      <Stack.Navigator initialRouteName={collectiblesRoutes.packDetail}>
        <Stack.Screen
          name={collectiblesRoutes.packDetail}
          component={PackDetailScreen}
          initialParams={{ packCode: 'pack-1' }}
        />
        <Stack.Screen
          name={collectiblesRoutes.buySheet}
          component={BuySheetStub}
        />
      </Stack.Navigator>,
    );

    fireEvent.press(screen.getByTestId('mock-open'));

    expect(
      await screen.findByText(
        `buy sheet: ${JSON.stringify({
          packCode: 'pack-1',
          name: 'Lorem',
          priceUsd: 25,
        })}`,
      ),
    ).toBeOnTheScreen();
  });
});
