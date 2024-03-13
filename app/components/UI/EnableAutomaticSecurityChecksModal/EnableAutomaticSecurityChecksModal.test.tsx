import { renderScreen } from '../../../util/test/renderWithProvider';
import { EnableAutomaticSecurityChecksModal } from './';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => jest.fn(),
}));

jest.mock('react-native-device-info', () => ({
  getBrand: () => 'some brand',
  getBuildNumber: () => 'some build number',
  getVersion: () => 'some version',
}));

describe('EnableAutomaticSecurityChecksModal', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      EnableAutomaticSecurityChecksModal,
      { name: 'EnableAutomaticSecurityChecksModal' },
      { state: {} },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
