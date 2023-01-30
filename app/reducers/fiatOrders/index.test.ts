import fiatOrderReducer, {
  addFiatCustomIdData,
  initialState,
  removeFiatCustomIdData,
  updateFiatCustomIdData,
} from '.';
import { CustomIdData, Action } from './types';

const dummyCustomOrderIdData1: CustomIdData = {
  id: '123',
  chainId: '1',
  account: '0x123',
  createdAt: 123,
  lastTimeFetched: 123,
  errorCount: 0,
};

const dummyCustomOrderIdData2: CustomIdData = {
  id: '456',
  chainId: '1',
  account: '0x123',
  createdAt: 123,
  lastTimeFetched: 123,
  errorCount: 0,
};
const dummyCustomOrderIdData3: CustomIdData = {
  id: '789',
  chainId: '1',
  account: '0x123',
  createdAt: 123,
  lastTimeFetched: 123,
  errorCount: 0,
};

const networks: AggregatorNetwork[] = [
  {
    active: true,
    chainId: 1,
    chainName: 'Ethereum Mainnet',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: 10,
    chainName: 'Optimism Mainnet',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: 25,
    chainName: 'Cronos Mainnet',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: 56,
    chainName: 'BNB Chain Mainnet',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: 137,
    chainName: 'Polygon Mainnet',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: 250,
    chainName: 'Fantom Mainnet',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: 1284,
    chainName: 'Moonbeam Mainnet',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: 42161,
    chainName: 'Arbitrum Mainnet',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: 42220,
    chainName: 'Celo Mainnet',
    nativeTokenSupported: false,
  },
  {
    active: true,
    chainId: 43114,
    chainName: 'Avalanche C-Chain Mainnet',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: 1313161554,
    chainName: 'Aurora Mainnet',
    nativeTokenSupported: false,
  },
  {
    active: true,
    chainId: 1666600000,
    chainName: 'Harmony Mainnet (Shard 0)',
    nativeTokenSupported: true,
  },
];

describe('fiatOrderReducer', () => {
  it('should return the initial state', () => {
    expect(fiatOrderReducer(undefined, {} as Action)).toEqual(initialState);
  });

  it('should add a custom order id object', () => {
    const stateWithCustomOrderId1 = fiatOrderReducer(
      initialState,
      addFiatCustomIdData(dummyCustomOrderIdData1),
    );

    const stateWithCustomOrderId1Again = fiatOrderReducer(
      stateWithCustomOrderId1 as typeof initialState,
      addFiatCustomIdData(dummyCustomOrderIdData1),
    );

    const stateWithCustomOrderId1and2 = fiatOrderReducer(
      stateWithCustomOrderId1Again as typeof initialState,
      addFiatCustomIdData(dummyCustomOrderIdData2),
    );

    expect(stateWithCustomOrderId1.customOrderIds).toEqual([
      dummyCustomOrderIdData1,
    ]);
    expect(stateWithCustomOrderId1Again.customOrderIds).toEqual([
      dummyCustomOrderIdData1,
    ]);
    expect(stateWithCustomOrderId1and2.customOrderIds).toEqual([
      dummyCustomOrderIdData1,
      dummyCustomOrderIdData2,
    ]);
  });

  it('should update a custom order id object', () => {
    const updatedCustomOrderIdData: CustomIdData = {
      ...dummyCustomOrderIdData2,
      createdAt: 456,
    };

    const stateWithCustomOrderId1 = fiatOrderReducer(
      initialState,
      addFiatCustomIdData(dummyCustomOrderIdData1),
    );

    const stateWithCustomOrderId1and2 = fiatOrderReducer(
      stateWithCustomOrderId1 as typeof initialState,
      addFiatCustomIdData(dummyCustomOrderIdData2),
    );

    const stateWithCustomOrderId1and2and3 = fiatOrderReducer(
      stateWithCustomOrderId1and2 as typeof initialState,
      addFiatCustomIdData(dummyCustomOrderIdData3),
    );

    const stateWithCustomOrderId2updated = fiatOrderReducer(
      stateWithCustomOrderId1and2and3 as typeof initialState,
      updateFiatCustomIdData(updatedCustomOrderIdData),
    );
    const stateWithUnexistingUpdate = fiatOrderReducer(
      stateWithCustomOrderId2updated as typeof initialState,
      updateFiatCustomIdData({
        ...updateFiatCustomIdData,
        id: 'does not exist',
      } as CustomIdData),
    );

    expect(stateWithCustomOrderId2updated.customOrderIds).toEqual([
      dummyCustomOrderIdData1,
      updatedCustomOrderIdData,
      dummyCustomOrderIdData3,
    ]);
    expect(stateWithUnexistingUpdate.customOrderIds).toEqual([
      dummyCustomOrderIdData1,
      updatedCustomOrderIdData,
      dummyCustomOrderIdData3,
    ]);
  });

  it('should remove a custom order id object', () => {
    const stateWithCustomOrderId1 = fiatOrderReducer(
      initialState,
      addFiatCustomIdData(dummyCustomOrderIdData1),
    );

    const stateWithCustomOrderId1and2 = fiatOrderReducer(
      stateWithCustomOrderId1 as typeof initialState,
      addFiatCustomIdData(dummyCustomOrderIdData2),
    );

    const stateWithCustomOrderId1and2and3 = fiatOrderReducer(
      stateWithCustomOrderId1and2 as typeof initialState,
      addFiatCustomIdData(dummyCustomOrderIdData3),
    );

    const stateWithCustomOrderId2removed = fiatOrderReducer(
      stateWithCustomOrderId1and2and3 as typeof initialState,
      removeFiatCustomIdData(dummyCustomOrderIdData2),
    );
    const stateWithCustomOrderId2removedAgain = fiatOrderReducer(
      stateWithCustomOrderId2removed as typeof initialState,
      removeFiatCustomIdData(dummyCustomOrderIdData2),
    );

    expect(stateWithCustomOrderId2removed.customOrderIds).toEqual([
      dummyCustomOrderIdData1,
      dummyCustomOrderIdData3,
    ]);

    expect(stateWithCustomOrderId2removedAgain.customOrderIds).toEqual([
      dummyCustomOrderIdData1,
      dummyCustomOrderIdData3,
    ]);
  });
});
