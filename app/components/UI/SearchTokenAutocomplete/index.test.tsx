import { renderScreen } from '../../../util/test/renderWithProvider';
import SearchTokenAutocomplete from './';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      PreferencesController: {
        useTokenDetection: true,
      },
    },
  },
};

describe('SearchTokenAutocomplete', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      SearchTokenAutocomplete,
      { name: 'SearchTokenAutocomplete' },
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
