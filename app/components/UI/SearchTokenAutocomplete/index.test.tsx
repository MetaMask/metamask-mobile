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
        selectedAddress: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
        identities: {
          '0x0': {
            address: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
            name: 'Account 1',
          },
        },
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
