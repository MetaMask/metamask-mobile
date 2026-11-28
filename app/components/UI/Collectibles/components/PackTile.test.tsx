import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useRoute } from '@react-navigation/native';
import { strings } from '../../../../../locales/i18n';
import render from '#app/util/test/renderWithProvider';
import { getFormatters } from '#app/components/hooks/useFormatters';
import { collectiblesRoutes } from '#app/components/UI/Collectibles/routeNames';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import { mockHomePacks } from '#app/components/UI/Collectibles/mocks/homePacks';
import { PackTile } from '#app/components/UI/Collectibles/components/PackTile';
import { Text } from '@metamask/design-system-react-native';

const Stack = createNativeStackNavigator();
const [pack] = mockHomePacks;

function BuySheetStub() {
  const { params } = useRoute();
  return <Text>{`buy sheet: ${JSON.stringify(params)}`}</Text>;
}

function PackDetailStub() {
  const { params } = useRoute();
  return <Text>{`pack detail: ${JSON.stringify(params)}`}</Text>;
}

describe('PackTile', () => {
  it.each([
    [1, '1 open'],
    [2, '2 opens'],
    [20_000, '20,000 opens, trending'],
  ])('labels a count of %d as "%s"', (openedCount, label) => {
    render(<PackTile pack={{ ...pack, openedCount }} />);
    expect(screen.getByLabelText(label)).toBeOnTheScreen();
  });

  it('shows the formatted count', () => {
    render(<PackTile pack={{ ...pack, openedCount: 1234 }} />);
    expect(screen.getByText('1,234')).toBeOnTheScreen();
  });

  it('opens the buy sheet for its pack when the price is pressed', async () => {
    render(
      <Stack.Navigator>
        <Stack.Screen name="Tile">
          {() => <PackTile pack={pack} />}
        </Stack.Screen>
        <Stack.Screen
          name={collectiblesRoutes.buySheet}
          component={BuySheetStub}
        />
      </Stack.Navigator>,
    );

    fireEvent.press(
      screen.getByRole('button', {
        name: getFormatters().formatCurrency(pack.priceUsd, 'USD'),
      }),
    );

    expect(
      await screen.findByText(
        `buy sheet: ${JSON.stringify({
          packCode: pack.code,
          name: pack.name,
          priceUsd: pack.priceUsd,
        })}`,
      ),
    ).toBeOnTheScreen();
  });

  it('tells screen readers which pack the price opens', () => {
    render(<PackTile pack={pack} />);

    expect(
      screen.getByHintText(
        strings('collectibles.buy_sheet.open_hint', { name: pack.name }),
      ),
    ).toBeOnTheScreen();
  });

  it('opens the pack detail when the art is pressed', async () => {
    render(
      <Stack.Navigator>
        <Stack.Screen name="Tile">
          {() => <PackTile pack={pack} />}
        </Stack.Screen>
        <Stack.Screen
          name={collectiblesRoutes.root}
          component={PackDetailStub}
        />
      </Stack.Navigator>,
    );

    fireEvent.press(
      screen.getByTestId(collectiblesTestIds.tileDetail(pack.code)),
    );

    expect(
      await screen.findByText(
        `pack detail: ${JSON.stringify({
          screen: collectiblesRoutes.packDetail,
          params: { packCode: pack.code },
        })}`,
      ),
    ).toBeOnTheScreen();
  });
});
