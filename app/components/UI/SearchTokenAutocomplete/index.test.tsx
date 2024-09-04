import { renderScreen } from '../../../util/test/renderWithProvider';
import SearchTokenAutocomplete from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { FunctionComponent } from 'react';
import mockedEngine from '../../../core/__mocks__/MockedEngine';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        useTokenDetection: true,
      },
    },
  },
};

describe('SearchTokenAutocomplete', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      SearchTokenAutocomplete as FunctionComponent,
      { name: 'SearchTokenAutocomplete' },
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
