import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import { resetOriginSpamState } from '../../../core/redux/slices/originThrottling';
import DappSpamModal, {
  BLOCK_BUTTON_TEST_ID,
  CONTINUE_BUTTON_TEST_ID,
} from './DappSpamModal';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => jest.fn(),
}));

const mockAction = { type: 'MOCK_ACTION' };
jest.mock('../../../core/redux/slices/originThrottling', () => ({
  resetOriginSpamState: jest.fn().mockImplementation(() => mockAction),
}));

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () =>
    ({ children }: { children: React.ReactElement }) =>
      <>{children}</>,
);

const SCAM_DOMAIN_MOCK = 'scam.domain';
const NAVIGATION_PARAMS_MOCK = {
  params: {
    domain: SCAM_DOMAIN_MOCK,
  },
};

const mockInitialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
    },
  },
};

describe('DappSpamModal', () => {
  const mockResetOriginSpamState = jest.mocked(resetOriginSpamState);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('renders', () => {
    it('spam modal content by default', () => {
      const { toJSON } = renderWithProvider(
        <DappSpamModal route={NAVIGATION_PARAMS_MOCK} />,
        {
          state: mockInitialState,
        },
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('SiteBlockedContent if user opt in to block dapp', () => {
      const wrapper = renderWithProvider(
        <DappSpamModal route={NAVIGATION_PARAMS_MOCK} />,
        {
          state: mockInitialState,
        },
      );
      fireEvent.press(wrapper.getByTestId(BLOCK_BUTTON_TEST_ID));
      expect(wrapper.toJSON()).toMatchSnapshot();
    });
  });

  it('reset dapp spam state on clicking continue button', () => {
    const wrapper = renderWithProvider(
      <DappSpamModal route={NAVIGATION_PARAMS_MOCK} />,
      {
        state: mockInitialState,
      },
    );
    fireEvent.press(wrapper.getByTestId(CONTINUE_BUTTON_TEST_ID));

    expect(mockResetOriginSpamState).toHaveBeenCalledTimes(1);
  });
});
