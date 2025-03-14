import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import ConfirmationFooter from './ConfirmationFooter';
import { ConfirmationFooterProps } from './ConfirmationFooter.types';
import { createMockAccountsControllerState } from '../../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { FooterButtonGroupActions } from './FooterButtonGroup/FooterButtonGroup.types';
import { MOCK_POOL_STAKING_SDK } from '../../../__mocks__/mockData';

const MOCK_ADDRESS_1 = '0x0';
const MOCK_ADDRESS_2 = '0x1';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
]);

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('../../../hooks/useStakeContext', () => ({
  useStakeContext: () => MOCK_POOL_STAKING_SDK,
}));

describe('ConfirmationFooter', () => {
  it('render matches snapshot', () => {
    const props: ConfirmationFooterProps = {
      valueWei: '3210000000000000',
      action: FooterButtonGroupActions.STAKE,
    };

    const { toJSON } = renderWithProvider(<ConfirmationFooter {...props} />, {
      state: mockInitialState,
    });

    expect(toJSON()).toMatchSnapshot();
  });
});
