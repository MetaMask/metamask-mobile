import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';
import { renderInterface } from '../testUtils';
import { Address } from '@metamask/snaps-sdk/jsx';

jest.mock('../../../../core/Engine/Engine');

const withBlockies = {
  avatarAccountType: AvatarAccountType.Blockies,
};

const withoutBlockies = {
  avatarAccountType: AvatarAccountType.Maskicon,
};

describe('SnapUIAddress', () => {
  it('renders legacy Ethereum address', () => {
    const { toJSON } = renderInterface(
      Address({
        address: '0xab16a96d359ec26a11e2c2b3d8f8b8942d5bfcdb',
      }),
      { stateSettings: withoutBlockies },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Ethereum address', () => {
    const { toJSON } = renderInterface(
      Address({
        address: 'eip155:1:0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb',
      }),
      { stateSettings: withoutBlockies },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders account name', () => {
    const { getByText } = renderInterface(
      Address({
        address: 'eip155:1:0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb',
        displayName: true,
      }),
      { stateSettings: withoutBlockies },
    );

    expect(getByText('My Account')).toBeDefined();
  });

  it('renders contact name', () => {
    const { getByText } = renderInterface(
      Address({
        address: 'eip155:1:0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcda',
        displayName: true,
      }),
    );

    expect(getByText('Test Contact')).toBeDefined();
  });

  it('renders Ethereum address with blockie', () => {
    const { toJSON } = renderInterface(
      Address({
        address: 'eip155:1:0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb',
      }),
      { stateSettings: withBlockies },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Bitcoin address', () => {
    const { toJSON } = renderInterface(
      Address({
        address:
          'bip122:000000000019d6689c085ae165831e93:128Lkh3S7CkDTBZ8W7BbpsN3YYizJMp8p6',
      }),
      { stateSettings: withoutBlockies },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Bitcoin address with blockie', () => {
    const { toJSON } = renderInterface(
      Address({
        address:
          'bip122:000000000019d6689c085ae165831e93:128Lkh3S7CkDTBZ8W7BbpsN3YYizJMp8p6',
      }),
      { stateSettings: withBlockies },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Cosmos address', () => {
    const { toJSON } = renderInterface(
      Address({
        address:
          'cosmos:cosmoshub-3:cosmos1t2uflqwqe0fsj0shcfkrvpukewcw40yjj6hdc0',
      }),
      { stateSettings: withoutBlockies },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Cosmos address with blockie', () => {
    const { toJSON } = renderInterface(
      Address({
        address:
          'cosmos:cosmoshub-3:cosmos1t2uflqwqe0fsj0shcfkrvpukewcw40yjj6hdc0',
      }),
      { stateSettings: withBlockies },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Polkadot address', () => {
    const { toJSON } = renderInterface(
      Address({
        address:
          'polkadot:b0a8d493285c2df73290dfb7e61f870f:5hmuyxw9xdgbpptgypokw4thfyoe3ryenebr381z9iaegmfy',
      }),
      { stateSettings: withoutBlockies },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Polkadot address with blockie', () => {
    const { toJSON } = renderInterface(
      Address({
        address:
          'polkadot:b0a8d493285c2df73290dfb7e61f870f:5hmuyxw9xdgbpptgypokw4thfyoe3ryenebr381z9iaegmfy',
      }),
      { stateSettings: withBlockies },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Starknet address', () => {
    const { toJSON } = renderInterface(
      Address({
        address:
          'starknet:SN_GOERLI:0x02dd1b492765c064eac4039e3841aa5f382773b598097a40073bd8b48170ab57',
      }),
      { stateSettings: withoutBlockies },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Starknet address with blockie', () => {
    const { toJSON } = renderInterface(
      Address({
        address:
          'starknet:SN_GOERLI:0x02dd1b492765c064eac4039e3841aa5f382773b598097a40073bd8b48170ab57',
      }),
      { stateSettings: withBlockies },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Hedera address', () => {
    const { toJSON } = renderInterface(
      Address({ address: 'hedera:mainnet:0.0.1234567890-zbhlt' }),
      { stateSettings: withoutBlockies },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders Hedera address with blockie', () => {
    const { toJSON } = renderInterface(
      Address({ address: 'hedera:mainnet:0.0.1234567890-zbhlt' }),
      { stateSettings: withBlockies },
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
