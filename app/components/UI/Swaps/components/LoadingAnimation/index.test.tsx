import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import LoadingAnimation from './';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { RootState } from '../../../../../reducers';

const mockInitialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

describe('LoadingAnimation', () => {
  it('renders', () => {
    const wrapper = renderWithProvider(<LoadingAnimation />, {
      state: mockInitialState,
    });
    expect(wrapper).toMatchSnapshot();
  });
});
