import React from 'react';
import { TokenIcon, TokenIconProps } from './token-icon';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { merge } from 'lodash';
import {
  otherControllersMock,
  tokenAddress1Mock,
} from '../../__mocks__/controllers/other-controllers-mock';

const ADDRESS_MOCK = tokenAddress1Mock;
const CHAIN_ID_MOCK = '0x1';

const STATE_MOCK = merge({}, otherControllersMock);

function render(props: TokenIconProps) {
  return renderWithProvider(<TokenIcon {...props} />, {
    state: STATE_MOCK,
  });
}

describe('TokenIcon', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders token icon', () => {
    const { getByTestId } = render({
      address: ADDRESS_MOCK,
      chainId: CHAIN_ID_MOCK,
    });

    expect(getByTestId('token-icon')).toHaveTextContent('T');
  });

  it('renders nothing if token not found', () => {
    const { queryByTestId } = render({
      address: '0x123',
      chainId: CHAIN_ID_MOCK,
    });

    expect(queryByTestId('token-icon')).toBeNull();
  });
});
