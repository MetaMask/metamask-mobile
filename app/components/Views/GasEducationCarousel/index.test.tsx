import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import GasEducationCarousel from '.';
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
    },
  },
};

describe('GasEducationCarousel', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <GasEducationCarousel
        navigation={{ getParam: () => false, setOptions: () => null }}
      />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
