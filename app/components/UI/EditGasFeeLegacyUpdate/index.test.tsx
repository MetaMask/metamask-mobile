import { shallow } from 'enzyme';
import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

import initialBackgroundState from '../../../util/test/initial-background-state.json';
import EditGasFeeLegacyUpdate from './';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};
const store = mockStore(initialState);

describe('EditGasFeeLegacyUpdate', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <EditGasFeeLegacyUpdate
          view={'Test'}
          analyticsParams={undefined}
          selectedGasObject={undefined}
          selected={''}
          chainId={''}
          onSave={undefined}
          gasEstimateType={''}
          gasOptions={{
            low: '',
            medium: '',
            high: '',
            gasPrice: '',
          }}
          error={undefined}
          onCancel={undefined}
          primaryCurrency={''}
          onUpdatingValuesStart={function (): void {
            throw new Error('Function not implemented.');
          }}
          onUpdatingValuesEnd={function (): void {
            throw new Error('Function not implemented.');
          }}
          animateOnChange={undefined}
          isAnimating={false}
          warningMinimumEstimateOption={''}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
