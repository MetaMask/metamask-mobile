/**
 * Component view tests for PerpsSelectModifyActionView.
 * State-driven via Redux (initialStatePerps); no hook/selector mocks.
 * Run with: yarn jest -c jest.config.view.js PerpsSelectModifyActionView.view.test
 */
import '../../../../../util/test/component-view/mocks';
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import Routes from '../../../../../constants/navigation/Routes';
import PerpsSelectModifyActionView from './PerpsSelectModifyActionView';
import type { Position } from '../../controllers/types';
import { renderScreenWithRoutes } from '../../../../../util/test/component-view/render';
import { initialStatePerps } from '../../../../../util/test/component-view/presets/perps';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';

const mockLongPosition: Position = {
  symbol: 'ETH',
  size: '2.5',
  marginUsed: '500',
  entryPrice: '2000',
  liquidationPrice: '1900',
  unrealizedPnl: '100',
  returnOnEquity: '0.20',
  leverage: { value: 10, type: 'isolated' },
  cumulativeFunding: { sinceOpen: '5', allTime: '10', sinceChange: '2' },
  positionValue: '5000',
  maxLeverage: 50,
  takeProfitCount: 0,
  stopLossCount: 0,
};

const extraRoutes = [
  { name: Routes.PERPS.CLOSE_POSITION },
  { name: Routes.PERPS.ADJUST_MARGIN },
  { name: Routes.PERPS.TUTORIAL },
  {
    name: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
    Component: () => <Text testID="route-order-confirmation">Order</Text>,
  },
];

function renderView(
  options: {
    overrides?: DeepPartial<RootState>;
    initialParams?: Record<string, unknown>;
  } = {},
) {
  const { overrides, initialParams } = options;
  const builder = initialStatePerps();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();
  return renderScreenWithRoutes(
    PerpsSelectModifyActionView as unknown as React.ComponentType,
    { name: Routes.PERPS.SELECT_MODIFY_ACTION },
    extraRoutes,
    { state },
    initialParams ?? { position: mockLongPosition },
  );
}

// Labels from locales/languages/en.json perps.modify
const ADD_TO_POSITION_LABEL = 'Increase exposure';
const REDUCE_POSITION_LABEL = 'Reduce exposure';
const FLIP_POSITION_LABEL = 'Reverse position';

describe('PerpsSelectModifyActionView', () => {
  it('renders the modify action sheet with options', () => {
    renderView();

    expect(screen.getByText(ADD_TO_POSITION_LABEL)).toBeOnTheScreen();
    expect(screen.getByText(REDUCE_POSITION_LABEL)).toBeOnTheScreen();
    expect(screen.getByText(FLIP_POSITION_LABEL)).toBeOnTheScreen();
  });

  it('renders add to position option', () => {
    renderView();

    expect(screen.getByText(ADD_TO_POSITION_LABEL)).toBeOnTheScreen();
  });

  it('renders reduce position option', () => {
    renderView();

    expect(screen.getByText(REDUCE_POSITION_LABEL)).toBeOnTheScreen();
  });

  it('renders flip position option', () => {
    renderView();

    expect(screen.getByText(FLIP_POSITION_LABEL)).toBeOnTheScreen();
  });

  it('reduce position action runs without error (navigates then sheet closes)', () => {
    renderView({ initialParams: { position: mockLongPosition } });

    fireEvent.press(screen.getByText(REDUCE_POSITION_LABEL));

    // Sheet closes after action (onClose), so we stay on modify screen; no throw
    expect(screen.getByText(FLIP_POSITION_LABEL)).toBeOnTheScreen();
  });
});
