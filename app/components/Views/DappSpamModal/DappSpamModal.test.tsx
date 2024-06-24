import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import {
  resetDappSpamState,
  resetSpamPrompt,
} from '../../../core/redux/slices/dappSpamFilter';
import DappSpamModal, {
  BLOCK_BUTTON_TEST_ID,
  CONTINUE_BUTTON_TEST_ID,
  GOT_IT_BUTTON_TEST_ID,
} from './DappSpamModal';

const mockAction = { type: 'MOCK_ACTION' };
jest.mock('../../../core/redux/slices/dappSpamFilter', () => ({
  resetDappSpamState: jest.fn().mockImplementation(() => mockAction),
  resetSpamPrompt: jest.fn().mockImplementation(() => mockAction),
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
  const mockResetDappSpamState = jest.mocked(resetDappSpamState);
  const mockResetSpamPrompt = jest.mocked(resetSpamPrompt);

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

    expect(mockResetDappSpamState).toHaveBeenCalledTimes(1);
    expect(mockResetSpamPrompt).toHaveBeenCalledTimes(1);
  });

  it('closes dapp modal after clicking confirm button', () => {
    const wrapper = renderWithProvider(
      <DappSpamModal route={NAVIGATION_PARAMS_MOCK} />,
      {
        state: mockInitialState,
      },
    );

    fireEvent.press(wrapper.getByTestId(BLOCK_BUTTON_TEST_ID));
    fireEvent.press(wrapper.getByTestId(GOT_IT_BUTTON_TEST_ID));

    expect(mockResetSpamPrompt).toHaveBeenCalledTimes(1);
  });
});
