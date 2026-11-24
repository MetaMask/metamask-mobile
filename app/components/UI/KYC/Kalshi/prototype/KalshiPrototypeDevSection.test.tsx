// PROTOTYPE-DO-NOT-MERGE
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import KalshiPrototypeDeveloperOptionsSection from './KalshiPrototypeDevSection';
import { KalshiPrototypeDevSectionSelectorsIDs } from './KalshiPrototypeDevSection.testIds';
import {
  activateKalshiPrototypeScenario,
  getKalshiPrototypeRuntime,
  resetKalshiPrototype,
} from './prototypeRuntime';

// The section only reads the navigation type for its navigate calls; the
// navigation itself is not under test here.
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

// The runtime reaches the Engine only through the injection's boundary swap;
// the test mocks it so the unit stays light.
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

describe('KalshiPrototypeDeveloperOptionsSection', () => {
  beforeEach(() => {
    devGlobal.__DEV__ = true;
    resetKalshiPrototype();
  });

  afterAll(() => {
    devGlobal.__DEV__ = originalDev;
    resetKalshiPrototype();
  });

  it('offers every scenario, including the status-card ones', () => {
    const { getByTestId } = render(<KalshiPrototypeDeveloperOptionsSection />);

    expect(
      getByTestId(
        `${KalshiPrototypeDevSectionSelectorsIDs.SCENARIO_OPTION}-newUserHasMfa`,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        `${KalshiPrototypeDevSectionSelectorsIDs.SCENARIO_OPTION}-leftPartWay`,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        `${KalshiPrototypeDevSectionSelectorsIDs.SCENARIO_OPTION}-stepUpRequired`,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        `${KalshiPrototypeDevSectionSelectorsIDs.SCENARIO_OPTION}-verifying`,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        `${KalshiPrototypeDevSectionSelectorsIDs.SCENARIO_OPTION}-cantVerify`,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        `${KalshiPrototypeDevSectionSelectorsIDs.SCENARIO_OPTION}-verified`,
      ),
    ).toBeOnTheScreen();
  });

  it('hides the resolve control while no review is pending', () => {
    const { queryByTestId } = render(
      <KalshiPrototypeDeveloperOptionsSection />,
    );

    expect(
      queryByTestId(KalshiPrototypeDevSectionSelectorsIDs.RESOLVE_VERIFIED),
    ).toBeNull();
    expect(
      queryByTestId(KalshiPrototypeDevSectionSelectorsIDs.RESOLVE_CANT_VERIFY),
    ).toBeNull();
  });

  it('resolves a pending review on the verified control', () => {
    activateKalshiPrototypeScenario('verifying');
    const { getByTestId } = render(<KalshiPrototypeDeveloperOptionsSection />);

    fireEvent.press(
      getByTestId(KalshiPrototypeDevSectionSelectorsIDs.RESOLVE_VERIFIED),
    );
    expect(getKalshiPrototypeRuntime().script?.vendor.status).toBe('approved');
  });

  it('resolves a pending review on the can-not-verify control', () => {
    activateKalshiPrototypeScenario('verifying');
    const { getByTestId } = render(<KalshiPrototypeDeveloperOptionsSection />);

    fireEvent.press(
      getByTestId(KalshiPrototypeDevSectionSelectorsIDs.RESOLVE_CANT_VERIFY),
    );
    expect(getKalshiPrototypeRuntime().script?.vendor.status).toBe('rejected');
  });
});
