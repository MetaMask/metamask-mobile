import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useRoute } from '@react-navigation/native';
import { strings } from '../../../../../locales/i18n';
import renderWithProvider from '#app/util/test/renderWithProvider';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import { collectiblesRoutes } from '#app/components/UI/Collectibles/routeNames';
import { mockHomePacks } from '#app/components/UI/Collectibles/mocks/homePacks';
import { PackTile } from '#app/components/UI/Collectibles/components/PackTile';
import { Text } from '#app/components/UI/primitives/Text';

const Stack = createNativeStackNavigator();
const [pack] = mockHomePacks;

function TileScreen() {
  return <PackTile pack={pack} />;
}

function BuySheetStub() {
  const { params } = useRoute();
  return <Text>{`buy sheet: ${JSON.stringify(params)}`}</Text>;
}

function renderTile() {
  return renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="Tile" component={TileScreen} />
      <Stack.Screen
        name={collectiblesRoutes.buySheet}
        component={BuySheetStub}
      />
    </Stack.Navigator>,
  );
}

describe('PackTile', () => {
  it('opens the buy sheet for its pack when the price is pressed', async () => {
    renderTile();

    fireEvent.press(
      screen.getByTestId(collectiblesTestIds.buyButton(pack.code)),
    );

    expect(
      await screen.findByText(
        `buy sheet: ${JSON.stringify({ packCode: pack.code })}`,
      ),
    ).toBeOnTheScreen();
  });

  it('tells screen readers which pack the price opens', () => {
    renderTile();

    expect(
      screen.getByHintText(
        strings('collectibles.buy_sheet.open_hint', { name: pack.name }),
      ),
    ).toBeOnTheScreen();
  });
});
