import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { SendContextProvider } from '../../../context/send-context';
import { Asset } from './asset';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }),
  useRoute: jest.fn().mockReturnValue({
    params: {
      asset: {},
    },
  }),
}));

const renderComponent = () =>
  renderWithProvider(
    <SendContextProvider>
      <Asset />
    </SendContextProvider>,
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );

describe('Asset', () => {
  it('renders correctly', async () => {
    const { getByText } = renderComponent();

    expect(getByText('Asset: NA')).toBeTruthy();
  });

  // to be uncommented after asset selection is implemented
  // it('navigate to next page when continue button is clicked', () => {
  //   const { getByText } = renderComponent();
  //   fireEvent.press(getByText('Continue'));
  //   expect(mockNavigate).toHaveBeenCalled();
  // });
});
