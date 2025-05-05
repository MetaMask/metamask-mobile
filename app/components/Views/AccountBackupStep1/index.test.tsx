import { ComponentType } from 'react';
import AccountBackupStep1 from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { renderScreen } from '../../../util/test/renderWithProvider';

// Use fake timers to resolve reanimated issues.
jest.useFakeTimers();

describe('AccountBackupStep1', () => {
  afterEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  it('should render correctly', () => {
    const wrapper = renderScreen(
      AccountBackupStep1 as ComponentType,
      { name: 'AccountBackupStep1' },
      {
        state: {
          engine: {
            backgroundState,
          },
        },
      },
    );
    expect(wrapper).toMatchSnapshot();
  });
});
