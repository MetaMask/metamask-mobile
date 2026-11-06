import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import FixedTabPillRow, { FixedTabPillRowProvider } from './FixedTabPillRow';

let mockIsGlassEnabled = false;
let mockIsBlurEnabled = false;

jest.mock('../../../../component-library/hooks/useLiquidGlass', () => {
  const actual = jest.requireActual(
    '../../../../component-library/hooks/useLiquidGlass',
  );
  return {
    ...actual,
    useLiquidGlass: () => ({
      ...actual.useLiquidGlass(),
      isGlassEnabled: mockIsGlassEnabled,
      isBlurEnabled: mockIsBlurEnabled,
    }),
  };
});

const pills = [
  { key: 'account', label: 'Account', Screen: () => null },
  { key: 'card', label: 'Card', Screen: () => null },
] as const;

const renderRow = () => {
  const onChange = jest.fn();
  const view = renderWithProvider(
    <FixedTabPillRowProvider
      value={{
        testID: 'hub',
        pills,
        selectedKey: 'account',
        onChange,
      }}
    >
      <FixedTabPillRow />
    </FixedTabPillRowProvider>,
  );

  return { ...view, onChange };
};

describe('FixedTabPillRow', () => {
  beforeEach(() => {
    mockIsGlassEnabled = false;
    mockIsBlurEnabled = false;
  });

  it('keeps the plain filter pills where glass is unavailable', () => {
    const { getByTestId, queryByTestId, onChange } = renderRow();

    expect(queryByTestId('hub-pill-account-glass')).toBeNull();
    expect(queryByTestId('hub-pill-card-glass')).toBeNull();

    fireEvent.press(getByTestId('hub-pill-card'));

    expect(onChange).toHaveBeenCalledWith('card');
  });

  it('draws every pill on liquid glass and accents the selected one', () => {
    mockIsGlassEnabled = true;
    const { getByTestId, onChange } = renderRow();
    const selected = getByTestId('hub-pill-account-glass');
    const unselected = getByTestId('hub-pill-card-glass');

    // eslint-disable-next-line @metamask/design-tokens/color-no-hex -- Asserts the new brand accent; no design token exists yet.
    expect(selected.props.tintColor).toBe('#BAF24A');
    expect(unselected.props.tintColor).toBeUndefined();
    expect(selected.props.isInteractive).toBe(true);

    fireEvent.press(getByTestId('hub-pill-card'));

    expect(onChange).toHaveBeenCalledWith('card');
  });

  it('draws the pills on the blurred capsule when liquid glass is off', () => {
    mockIsBlurEnabled = true;
    const { getByTestId } = renderRow();

    expect(getByTestId('hub-pill-account-glass')).toBeOnTheScreen();
    expect(getByTestId('hub-pill-card-glass')).toBeOnTheScreen();
  });
});
