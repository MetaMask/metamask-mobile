import { renderScreen } from '../../..//util/test/renderWithProvider';
import { UpdateNeeded } from './';

jest.mock('react-native-device-info', () => ({
  getBrand: () => 'some brand',
  getBuildNumber: () => 'some build number',
  getVersion: () => 'some version',
}));

describe('UpdateNeeded', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      UpdateNeeded,
      { name: 'UpdateNeeded' },
      { state: {} },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
