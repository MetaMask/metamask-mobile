import { renderScreen } from '../../../util/test/renderWithProvider';
import SearchTokenAutocomplete from './';
import { backgroundState } from '../../../util/test/initial-root-state';

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
      SearchTokenAutocomplete,
      { name: 'SearchTokenAutocomplete' },
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
