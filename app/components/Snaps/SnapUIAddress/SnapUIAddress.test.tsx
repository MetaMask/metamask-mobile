import React from 'react';
import { SnapUIAddress } from './SnapUIAddress';
import renderWithProvider from '../../../util/test/renderWithProvider';

const baseMockState = {
  state: {
    engine: {
      backgroundState: {
        KeyringController: {
          keyrings: []
        },
        AccountsController: {
          internalAccounts: {
            accounts: {
              'foo': {
                address: '0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb',
                metadata: {
                  name: 'My Account',
                }
              }
            }
          }
        },
        AddressBookController: {
          addressBook: {
            '0x1': {
              '0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcda': {
                address: '0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcda',
                name: 'Test Contact',
              }
            }
          }
        }
      }
    },
  }
};

const mockStateWithoutBlockies = {
  state: {
    ...baseMockState.state,
    settings: {
      useBlockieIcon: false,
    },
  },
};

const mockStateWithBlockies = {
  state: {
    ...baseMockState.state,
    settings: {
      useBlockieIcon: true,
    },
  },
};

describe('SnapUIAddress', () => {
  it('renders legacy Ethereum address', () => {
    const { toJSON } = renderWithProvider(
      <SnapUIAddress address="0xab16a96d359ec26a11e2c2b3d8f8b8942d5bfcdb" />,
      mockStateWithoutBlockies,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Ethereum address', () => {
    const { toJSON } = renderWithProvider(
      <SnapUIAddress address="eip155:1:0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb" />,
      mockStateWithoutBlockies,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders account name', () => {
    const { getByText } = renderWithProvider(
      <SnapUIAddress address="eip155:1:0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb" displayName />,
      baseMockState
    );

    expect(getByText('My Account')).toBeDefined();
  });

  it('renders contact name', () => {
    const { getByText } = renderWithProvider(
      <SnapUIAddress address="eip155:1:0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcda" displayName />,
      baseMockState
    );

    expect(getByText('Test Contact')).toBeDefined();
  });


  it('renders Ethereum address with blockie', () => {
    const { toJSON } = renderWithProvider(
      <SnapUIAddress address="eip155:1:0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb" />,
      mockStateWithBlockies,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Bitcoin address', () => {
    const { toJSON } = renderWithProvider(
      <SnapUIAddress address="bip122:000000000019d6689c085ae165831e93:128Lkh3S7CkDTBZ8W7BbpsN3YYizJMp8p6" />,
      mockStateWithoutBlockies,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Bitcoin address with blockie', () => {
    const { toJSON } = renderWithProvider(
      <SnapUIAddress address="bip122:000000000019d6689c085ae165831e93:128Lkh3S7CkDTBZ8W7BbpsN3YYizJMp8p6" />,
      mockStateWithBlockies,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Cosmos address', () => {
    const { toJSON } = renderWithProvider(
      <SnapUIAddress address="cosmos:cosmoshub-3:cosmos1t2uflqwqe0fsj0shcfkrvpukewcw40yjj6hdc0" />,
      mockStateWithoutBlockies,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Cosmos address with blockie', () => {
    const { toJSON } = renderWithProvider(
      <SnapUIAddress address="cosmos:cosmoshub-3:cosmos1t2uflqwqe0fsj0shcfkrvpukewcw40yjj6hdc0" />,
      mockStateWithBlockies,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Polkadot address', () => {
    const { toJSON } = renderWithProvider(
      <SnapUIAddress address="polkadot:b0a8d493285c2df73290dfb7e61f870f:5hmuyxw9xdgbpptgypokw4thfyoe3ryenebr381z9iaegmfy" />,
      mockStateWithoutBlockies,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Polkadot address with blockie', () => {
    const { toJSON } = renderWithProvider(
      <SnapUIAddress address="polkadot:b0a8d493285c2df73290dfb7e61f870f:5hmuyxw9xdgbpptgypokw4thfyoe3ryenebr381z9iaegmfy" />,
      mockStateWithBlockies,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Starknet address', () => {
    const { toJSON } = renderWithProvider(
      <SnapUIAddress address="starknet:SN_GOERLI:0x02dd1b492765c064eac4039e3841aa5f382773b598097a40073bd8b48170ab57" />,
      mockStateWithoutBlockies,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Starknet address with blockie', () => {
    const { toJSON } = renderWithProvider(
      <SnapUIAddress address="starknet:SN_GOERLI:0x02dd1b492765c064eac4039e3841aa5f382773b598097a40073bd8b48170ab57" />,
      mockStateWithBlockies,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Hedera address', () => {
    const { toJSON } = renderWithProvider(
      <SnapUIAddress address="hedera:mainnet:0.0.1234567890-zbhlt" />,
      mockStateWithoutBlockies,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Hedera address with blockie', () => {
    const { toJSON } = renderWithProvider(
      <SnapUIAddress address="hedera:mainnet:0.0.1234567890-zbhlt" />,
      mockStateWithBlockies,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
