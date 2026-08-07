import React from 'react';
import { Text } from 'react-native';
import { act, screen } from '@testing-library/react-native';
import { RampSDKProvider, useRampSDK, SDK } from './index';
import { I18nEvents } from '../../../../../../locales/i18n';
import { RampType } from '../types';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

/**
 * Renders ramp SDK context fields into the tree so tests can assert via
 * `screen` queries instead of assigning outer-scope variables during render
 * (a React Compiler purity violation).
 */
function RampSDKContextProbe() {
  const { rampType, isBuy, isSell } = useRampSDK();
  return (
    <>
      <Text>{`Ramp Type: ${rampType}`}</Text>
      <Text>{`Is Buy: ${String(isBuy)}`}</Text>
      <Text>{`Is Sell: ${String(isSell)}`}</Text>
    </>
  );
}

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

const mockedState = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
  fiatOrders: {
    activationKeys: [],
    region: null,
    paymentMethod: null,
    getStarted: false,
    getStartedSell: false,
  },
};

describe('RampSDKProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockClear();
  });

  it('renders without crashing', () => {
    const TestComponent = () => {
      const { rampType } = useRampSDK();
      return <Text>{`Ramp Type: ${rampType}`}</Text>;
    };

    renderWithProvider(
      <RampSDKProvider>
        <TestComponent />
      </RampSDKProvider>,
      {
        state: mockedState,
      },
    );

    expect(screen.getByText('Ramp Type: buy')).toBeOnTheScreen();
  });

  it('provides default ramp type as BUY', () => {
    renderWithProvider(
      <RampSDKProvider>
        <RampSDKContextProbe />
      </RampSDKProvider>,
      {
        state: mockedState,
      },
    );

    expect(screen.getByText(`Ramp Type: ${RampType.BUY}`)).toBeOnTheScreen();
    expect(screen.getByText('Is Buy: true')).toBeOnTheScreen();
    expect(screen.getByText('Is Sell: false')).toBeOnTheScreen();
  });

  it('accepts custom ramp type', () => {
    renderWithProvider(
      <RampSDKProvider rampType={RampType.SELL}>
        <RampSDKContextProbe />
      </RampSDKProvider>,
      {
        state: mockedState,
      },
    );

    expect(screen.getByText(`Ramp Type: ${RampType.SELL}`)).toBeOnTheScreen();
    expect(screen.getByText('Is Buy: false')).toBeOnTheScreen();
    expect(screen.getByText('Is Sell: true')).toBeOnTheScreen();
  });

  it('syncs SDK locale on mount', () => {
    const setLocaleSpy = jest.spyOn(SDK, 'setLocale');
    const TestComponent = () => <Text>Test</Text>;

    renderWithProvider(
      <RampSDKProvider>
        <TestComponent />
      </RampSDKProvider>,
      { state: mockedState },
    );

    expect(setLocaleSpy).toHaveBeenCalledWith(expect.any(String));

    setLocaleSpy.mockRestore();
  });

  it('updates SDK locale when locale changes', () => {
    const setLocaleSpy = jest.spyOn(SDK, 'setLocale');
    const TestComponent = () => <Text>Test</Text>;

    renderWithProvider(
      <RampSDKProvider>
        <TestComponent />
      </RampSDKProvider>,
      { state: mockedState },
    );

    setLocaleSpy.mockClear();

    act(() => {
      I18nEvents.emit('localeChanged', 'es');
    });

    expect(setLocaleSpy).toHaveBeenCalledWith('es');

    setLocaleSpy.mockRestore();
  });

  it('removes locale listener on unmount', () => {
    const removeListenerSpy = jest.spyOn(I18nEvents, 'removeListener');
    const TestComponent = () => <Text>Test</Text>;

    const { unmount } = renderWithProvider(
      <RampSDKProvider>
        <TestComponent />
      </RampSDKProvider>,
      { state: mockedState },
    );

    unmount();

    expect(removeListenerSpy).toHaveBeenCalledWith(
      'localeChanged',
      expect.any(Function),
    );

    removeListenerSpy.mockRestore();
  });
});
