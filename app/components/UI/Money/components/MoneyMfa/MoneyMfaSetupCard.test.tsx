import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import MoneyMfaSetupCard from './MoneyMfaSetupCard';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';
import { useActiveMfaFlow } from '../../../../../util/identity/mfa/engine/useActiveMfaFlow';
import { GLASS_SURFACE_SHEEN_TEST_ID } from '../../../../../component-library/components-temp/BoxGlass/BoxGlass';

jest.mock('../../../../../component-library/hooks/useLiquidGlass', () => {
  const actual = jest.requireActual(
    '../../../../../component-library/hooks/useLiquidGlass',
  );
  return {
    ...actual,
    useLiquidGlass: () => ({
      ...actual.useLiquidGlass(),
      isGlassEnabled: true,
    }),
  };
});

jest.mock('../../../../../util/identity/mfa/engine/useActiveMfaFlow', () => ({
  useActiveMfaFlow: jest.fn(),
}));

jest.mock('./MoneyMfaShieldAnimation', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: () => <View /> };
});

const mockUseActiveMfaFlow = jest.mocked(useActiveMfaFlow);

describe('MoneyMfaSetupCard', () => {
  beforeEach(() => {
    mockUseActiveMfaFlow.mockReturnValue(undefined);
  });

  it('renders the card title, description and call to action', () => {
    const { getByTestId, getByText } = render(
      <MoneyMfaSetupCard onSetUp={jest.fn()} />,
    );

    expect(getByTestId(MoneyMfaTestIds.SETUP_CARD)).toBeOnTheScreen();
    expect(getByText(strings('money.mfa.card_title'))).toBeOnTheScreen();
    expect(getByText(strings('money.mfa.card_description'))).toBeOnTheScreen();
    expect(getByTestId(MoneyMfaTestIds.SETUP_CARD_BUTTON)).toHaveTextContent(
      strings('money.mfa.card_cta'),
    );
  });

  it('draws the glass surface when isGlass is true', () => {
    const { getByTestId } = render(
      <MoneyMfaSetupCard onSetUp={jest.fn()} isGlass />,
    );

    expect(getByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).toBeOnTheScreen();
  });

  it('draws the opaque surface when isGlass is false', () => {
    const { queryByTestId } = render(<MoneyMfaSetupCard onSetUp={jest.fn()} />);

    expect(queryByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).not.toBeOnTheScreen();
  });

  it('calls onSetUp when the call to action is pressed', () => {
    const onSetUp = jest.fn();
    const { getByTestId } = render(<MoneyMfaSetupCard onSetUp={onSetUp} />);

    fireEvent.press(getByTestId(MoneyMfaTestIds.SETUP_CARD_BUTTON));

    expect(onSetUp).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['disables', 'money.mfa.turnOn', 0],
    ['keeps enabled', 'vba.activate', 1],
  ])(
    '%s the call to action while a %s verification is starting',
    (_label, operation, expectedCalls) => {
      mockUseActiveMfaFlow.mockReturnValue({
        flow: { reason: { operation } },
        state: { step: { name: 'idle' } },
      } as ReturnType<typeof useActiveMfaFlow>);
      const onSetUp = jest.fn();
      const { getByTestId } = render(<MoneyMfaSetupCard onSetUp={onSetUp} />);

      fireEvent.press(getByTestId(MoneyMfaTestIds.SETUP_CARD_BUTTON));

      expect(onSetUp).toHaveBeenCalledTimes(expectedCalls);
    },
  );
});
