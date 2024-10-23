import React from 'react';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import AnnouncementCtaFooter from '.';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import MOCK_NOTIFICATIONS from '../../../../UI/Notification/__mocks__/mock_notifications';
import { ModalFooterType } from '../../../../../util/notifications';

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('AnnouncementCtaFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('matches snapshot', () => {
    const { toJSON } = renderScreen(
      () => (
        <AnnouncementCtaFooter
          modalFooter={{
            type: ModalFooterType.ANNOUNCEMENT_CTA,
            mobileLink: {
              extensionLinkRoute: 'https://www.metamask.io',
              extensionLinkText: 'Metamask',
            },
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
