// PROTOTYPE-DO-NOT-MERGE
import React from 'react';
import { act, render } from '@testing-library/react-native';
import KalshiPrototypePredictionsHome from './KalshiPrototypePredictionsHome';
import { KalshiPrototypePredictionsHomeSelectorsIDs } from './KalshiPrototypePredictionsHome.testIds';
import { KalshiPrototypeStatusCardSelectorsIDs } from './KalshiPrototypeStatusCard.testIds';
import {
  activateKalshiPrototypeScenario,
  dismissKalshiPrototypeCard,
  resetKalshiPrototype,
} from './prototypeRuntime';
import { PROTOTYPE_COPY } from './prototypeConstants';

// The screen only reads the navigation for its navigate calls; the polling
// focus effect is not under test here.
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

// The card's Rive thumbnails need a navigator; this test has none.
jest.mock(
  '../../../Money/components/MoneyVbaHomeCard/MoneyVbaHomeCardHeroAnimation',
  () => () => null,
);

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      KycController: {
        state: {},
        fetchSessionDisclaimers: jest.fn(),
      },
    },
  },
}));

const devGlobal = globalThis as { __DEV__?: boolean };
const originalDev = devGlobal.__DEV__;

describe('KalshiPrototypePredictionsHome', () => {
  beforeEach(() => {
    devGlobal.__DEV__ = true;
    resetKalshiPrototype();
  });

  afterAll(() => {
    devGlobal.__DEV__ = originalDev;
    resetKalshiPrototype();
  });

  it('keeps the get-started card on screen with no close button', () => {
    activateKalshiPrototypeScenario('newUserHasMfa');

    const { getByTestId, getByText, queryByTestId } = render(
      <KalshiPrototypePredictionsHome />,
    );

    expect(
      getByTestId(KalshiPrototypePredictionsHomeSelectorsIDs.GET_STARTED_CARD),
    ).toBeOnTheScreen();
    expect(getByText(PROTOTYPE_COPY.card.getStarted.title)).toBeOnTheScreen();
    expect(
      queryByTestId(KalshiPrototypeStatusCardSelectorsIDs.CLOSE_BUTTON),
    ).toBeNull();
  });

  it('shows the get-started card even when a dismissal is recorded', () => {
    activateKalshiPrototypeScenario('newUserHasMfa');
    act(() => {
      dismissKalshiPrototypeCard();
    });

    const { getByTestId } = render(<KalshiPrototypePredictionsHome />);

    expect(
      getByTestId(KalshiPrototypePredictionsHomeSelectorsIDs.GET_STARTED_CARD),
    ).toBeOnTheScreen();
  });

  it('still hides a dismissed terminal card until the scenario resets', () => {
    activateKalshiPrototypeScenario('verified');
    act(() => {
      dismissKalshiPrototypeCard();
    });

    const { queryByTestId } = render(<KalshiPrototypePredictionsHome />);

    expect(
      queryByTestId(
        KalshiPrototypePredictionsHomeSelectorsIDs.GET_STARTED_CARD,
      ),
    ).toBeNull();
  });
});
