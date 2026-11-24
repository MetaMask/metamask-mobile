// PROTOTYPE-DO-NOT-MERGE
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import KalshiPrototypeDeveloperOptionsSection from './KalshiPrototypeDevSection';
import { KalshiPrototypeDevSectionSelectorsIDs } from './KalshiPrototypeDevSection.testIds';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
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
    mockNavigate.mockClear();
  });

  afterAll(() => {
    devGlobal.__DEV__ = originalDev;
  });

  it('opens the prototype settings screen', () => {
    const { getByTestId } = render(<KalshiPrototypeDeveloperOptionsSection />);

    fireEvent.press(getByTestId(KalshiPrototypeDevSectionSelectorsIDs.OPEN));
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SETTINGS.KALSHI_PROTOTYPE_SETTINGS,
    );
  });

  it('keeps the scenario list off Developer options', () => {
    const { queryByTestId } = render(
      <KalshiPrototypeDeveloperOptionsSection />,
    );

    expect(
      queryByTestId(
        `${KalshiPrototypeDevSectionSelectorsIDs.SCENARIO_OPTION}-newUserHasMfa`,
      ),
    ).toBeNull();
  });
});
