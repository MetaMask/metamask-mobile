import React from 'react';
import { Text } from 'react-native';
import { Provider, useSelector } from 'react-redux';
import { act } from '@testing-library/react-native';
import { measureRenders } from 'reassure';
import { cloneDeep } from 'lodash';
import configureStore from '../../../../util/test/configureStore';
import { initialState as mockRootState } from '../../../../components/UI/Bridge/_mocks_/initialState';
import {
  selectBatchSellQuotes,
  selectBatchSellTrades,
  selectBridgeQuotes,
  setSourceAmount,
} from '.';

const store = configureStore(cloneDeep(mockRootState));

const ProvidersWrapper: React.ComponentType<{
  children: React.ReactElement;
}> = ({ children }) => <Provider store={store}>{children}</Provider>;

function BridgeQuoteSelectorPerfHarness() {
  useSelector(selectBridgeQuotes);
  useSelector(selectBatchSellQuotes);
  useSelector(selectBatchSellTrades);

  return <Text>Bridge quote selector perf</Text>;
}

test('Bridge quote selector unrelated update performance', async () => {
  const scenario = async () => {
    act(() => {
      for (let index = 0; index < 25; index++) {
        store.dispatch(setSourceAmount(String(index)));
      }
    });
  };

  await measureRenders(<BridgeQuoteSelectorPerfHarness />, {
    scenario,
    wrapper: ProvidersWrapper,
  });
}, 30000);
