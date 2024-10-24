import React from 'react';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import BlockExplorerFooter from '.';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import MOCK_NOTIFICATIONS from '../../../../UI/Notification/__mocks__/mock_notifications';
import { ModalFooterType } from '../../../../../util/notifications';

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('BlockExplorerFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('matches snapshot', () => {
    const { toJSON } = renderScreen(
      () => (
        <BlockExplorerFooter
          modalFooter={{
            type: ModalFooterType.BLOCK_EXPLORER,
            chainId: 1,
            txHash: '0x123',
          }}
          notification={MOCK_NOTIFICATIONS[0]}
        />
      ),
      {
        name: 'BlockExplorerFooter',
      },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
