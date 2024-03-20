import { ComponentType } from 'react';
import AccountBackupStep1 from './';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import { renderScreen } from '../../../util/test/renderWithProvider';

jest.mock('../../../core/Engine', () => ({
  hasFunds: jest.fn(),
}));

// Use fake timers to resolve reanimated issues.
jest.useFakeTimers();

describe('AccountBackupStep1', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render correctly', () => {
    const wrapper = renderScreen(
      AccountBackupStep1 as ComponentType,
      { name: 'AccountBackupStep1' },
      {
        state: {
          engine: {
            backgroundState: initialBackgroundState,
          },
        },
      },
    );
    expect(wrapper).toMatchSnapshot();
  });
});
