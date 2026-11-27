import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SocialPostAppealView from './SocialPostAppealView';
import { SocialPostAppealViewSelectorsIDs } from './SocialPostAppealView.testIds';

type BeforeRemoveListener = (event: { preventDefault: () => void }) => void;

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  getState: () => ({ index: 2 }),
  addListener: jest.fn(),
};
const mockUnsubscribe = jest.fn();
const mockSubmitSocialAppeal = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({
    params: {
      kind: 'post-removed',
      handle: 'alphawhale',
      reason: 'Promises guaranteed returns',
    },
  }),
}));

jest.mock('../../../UI/SocialFeed/socialAppealApi', () => ({
  ...jest.requireActual('../../../UI/SocialFeed/socialAppealApi'),
  submitSocialAppeal: (...args: unknown[]) => mockSubmitSocialAppeal(...args),
}));

const confirmAppeal = async () => {
  renderWithProvider(<SocialPostAppealView />);
  fireEvent.changeText(
    screen.getByTestId(SocialPostAppealViewSelectorsIDs.EMAIL_INPUT),
    'alex@example.com',
  );
  fireEvent.changeText(
    screen.getByTestId(SocialPostAppealViewSelectorsIDs.MESSAGE_INPUT),
    'I appeal.',
  );
  fireEvent.press(
    screen.getByTestId(SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON),
  );
  await screen.findByTestId(SocialPostAppealViewSelectorsIDs.SUCCESS_TITLE);
};

const getBeforeRemoveListener = (): BeforeRemoveListener => {
  const call = mockNavigation.addListener.mock.calls.find(
    ([name]) => name === 'beforeRemove',
  );
  return call?.[1] as BeforeRemoveListener;
};

describe('SocialPostAppealView confirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigation.addListener.mockReturnValue(mockUnsubscribe);
    mockSubmitSocialAppeal.mockResolvedValue({ ticketId: '1' });
  });

  it('does not intercept back while the form is showing', () => {
    renderWithProvider(<SocialPostAppealView />);

    expect(mockNavigation.addListener).not.toHaveBeenCalled();
    expect(mockNavigation.setOptions).not.toHaveBeenCalled();
  });

  it('turns off the swipe-back gesture once the appeal is confirmed', async () => {
    await confirmAppeal();

    expect(mockNavigation.setOptions).toHaveBeenCalledWith({
      gestureEnabled: false,
    });
  });

  it('leaves the flow like Done when the viewer goes back from the confirmation', async () => {
    await confirmAppeal();
    const preventDefault = jest.fn();

    getBeforeRemoveListener()({ preventDefault });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1);
    expect(mockNavigation.dispatch.mock.calls[0][0]).toMatchObject({
      type: 'POP',
      payload: { count: 2 },
    });
  });

  it('lets the removal Done started go through', async () => {
    await confirmAppeal();
    const preventDefault = jest.fn();
    mockNavigation.dispatch.mockImplementation(() =>
      getBeforeRemoveListener()({ preventDefault }),
    );

    fireEvent.press(
      screen.getByTestId(SocialPostAppealViewSelectorsIDs.DONE_BUTTON),
    );

    expect(preventDefault).not.toHaveBeenCalled();
    expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1);
  });

  it('stops intercepting back when the screen unmounts', async () => {
    await confirmAppeal();

    screen.unmount();

    await waitFor(() => expect(mockUnsubscribe).toHaveBeenCalled());
  });
});
