import AccountBackupStep1B from './';
import { renderScreen } from '../../../util/test/renderWithProvider';

describe('AccountBackupStep1B', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should render correctly', () => {
    const { toJSON } = renderScreen(AccountBackupStep1B, {
      name: 'AccountBackupStep1B',
    });
    expect(toJSON()).toMatchSnapshot();
  });
});
