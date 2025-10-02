import React from 'react';
import { Text } from 'react-native';
import { screen } from '@testing-library/react-native';
import { RampSDKProvider, useRampSDK } from './index';
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
});
