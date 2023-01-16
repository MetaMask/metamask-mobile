import fiatOrderReducer, {
  addFiatCustomIdData,
  getProviderName,
  initialState,
  removeFiatCustomIdData,
  updateFiatCustomIdData,
} from '.';
import { FIAT_ORDER_PROVIDERS } from '../../constants/on-ramp';
import { CustomIdData, Action, FiatOrder } from './types';

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

describe('getProviderName', () => {
  it.each`
    provider                               | providerName
    ${FIAT_ORDER_PROVIDERS.WYRE}           | ${'Wyre'}
    ${FIAT_ORDER_PROVIDERS.WYRE_APPLE_PAY} | ${'Wyre'}
    ${FIAT_ORDER_PROVIDERS.TRANSAK}        | ${'Transak'}
    ${FIAT_ORDER_PROVIDERS.MOONPAY}        | ${'MoonPay'}
    ${FIAT_ORDER_PROVIDERS.AGGREGATOR}     | ${'Test Provider'}
  `('should return the correct provider name', ({ provider, providerName }) => {
    const dummyData = {
      provider: {
        name: 'Test Provider',
      },
    } as Partial<FiatOrder['data']>;
    expect(getProviderName(provider, dummyData as FiatOrder['data'])).toEqual(
      providerName,
    );
  });

  it('should return the correct provider name for unknown provider', () => {
    expect(
      getProviderName(
        'unknown provider' as FIAT_ORDER_PROVIDERS,
        {} as FiatOrder['data'],
      ),
    ).toEqual('unknown provider');
  });

  it('should return ... for missing aggregator provider', () => {
    expect(
      getProviderName(FIAT_ORDER_PROVIDERS.AGGREGATOR, {} as FiatOrder['data']),
    ).toEqual('...');
  });
});
