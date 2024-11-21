import Approval from '.';
import { renderScreen } from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';

const approvalState = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

jest.mock('../../../../core/Engine', () => ({
  rejectPendingApproval: jest.fn(),
  context: {
    KeyringController: {
      resetQRKeyringState: jest.fn(),
    },
  },
  controllerMessenger: {
    tryUnsubscribe: jest.fn(),
  },
}));

describe('Approval', () => {
  it('render matches snapshot', () => {
    const wrapper = renderScreen(
      Approval,
      { name: 'Approval' },
      {
        state: approvalState,
      },
    );
    expect(wrapper).toMatchSnapshot();
  });
});
