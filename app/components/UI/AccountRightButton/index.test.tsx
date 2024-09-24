import React from 'react';
import {
  DeepPartial,
  renderScreen,
} from '../../../util/test/renderWithProvider';
import AccountRightButton from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RootState } from '../../../reducers';
import { mainnetNetworkState } from '../../../util/networks/constants';

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mainnetNetworkState,
      },
      SelectedNetworkController: {
        domains: {},
      },
    },
  },
};

describe('AccountRightButton', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      () => (
        <AccountRightButton
          selectedAddress="0x123"
          onPress={() => undefined}
          isNetworkVisible
        />
      ),
      {
        name: 'AccountRightButton',
      },
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
