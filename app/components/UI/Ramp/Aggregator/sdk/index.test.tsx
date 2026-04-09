import React from 'react';
import { Text } from 'react-native';
import { act, screen } from '@testing-library/react-native';
import { RampSDKProvider, useRampSDK, SDK } from './index';
import { I18nEvents } from '../../../../../../locales/i18n';
import { RampType } from '../types';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

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
    let contextValue: ReturnType<typeof useRampSDK> | undefined;
    const TestComponent = () => {
      contextValue = useRampSDK();
      return <Text>Test Component</Text>;
    };

    renderWithProvider(
      <RampSDKProvider>
        <TestComponent />
      </RampSDKProvider>,
      {
        state: mockedState,
      },
    );

    expect(contextValue?.rampType).toBe(RampType.BUY);
    expect(contextValue?.isBuy).toBe(true);
    expect(contextValue?.isSell).toBe(false);
  });

  it('accepts custom ramp type', () => {
    let contextValue: ReturnType<typeof useRampSDK> | undefined;
    const TestComponent = () => {
      contextValue = useRampSDK();
      return <Text>Test Component</Text>;
    };

    renderWithProvider(
      <RampSDKProvider rampType={RampType.SELL}>
        <TestComponent />
      </RampSDKProvider>,
      {
        state: mockedState,
      },
    );

    expect(contextValue?.rampType).toBe(RampType.SELL);
    expect(contextValue?.isBuy).toBe(false);
    expect(contextValue?.isSell).toBe(true);
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
