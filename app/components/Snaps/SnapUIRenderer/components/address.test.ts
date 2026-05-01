import { Image } from 'react-native';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';
import { renderInterface } from '../testUtils';
import { Address } from '@metamask/snaps-sdk/jsx';
import { toDataUrl } from '../../../../util/blockies';
import { shortenString } from '../../../../util/notifications/methods';

jest.mock('../../../../core/Engine/Engine');

const withBlockies = {
  avatarAccountType: AvatarAccountType.Blockies,
};

const withoutBlockies = {
  avatarAccountType: AvatarAccountType.Maskicon,
};

describe('SnapUIAddress', () => {
  it('renders legacy Ethereum address', () => {
    const { getByTestId, getByText } = renderInterface(
      Address({
        address: '0xab16a96d359ec26a11e2c2b3d8f8b8942d5bfcdb',
      }),
      { stateSettings: withoutBlockies },
    );

    expect(getByTestId('snap-ui-avatar')).toBeOnTheScreen();
    expect(
      getByText(shortenString('0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb')),
    ).toBeOnTheScreen();
  });

  it('renders Ethereum address', () => {
    const { getByTestId, getByText } = renderInterface(
      Address({
        address: 'eip155:1:0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb',
      }),
      { stateSettings: withoutBlockies },
    );

    expect(getByTestId('snap-ui-avatar')).toBeOnTheScreen();
    expect(
      getByText(shortenString('0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb')),
    ).toBeOnTheScreen();
  });

  it('renders account name', () => {
    const { getByText } = renderInterface(
      Address({
        address: 'eip155:1:0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb',
        displayName: true,
      }),
      { stateSettings: withoutBlockies },
    );

    expect(getByText('My Account')).toBeOnTheScreen();
  });

  it('renders contact name', () => {
    const { getByText } = renderInterface(
      Address({
        address: 'eip155:1:0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcda',
        displayName: true,
      }),
    );

    expect(getByText('Test Contact')).toBeOnTheScreen();
  });

  it('renders Ethereum address with blockie', () => {
    const { getByTestId, getByText, UNSAFE_getByType } = renderInterface(
      Address({
        address: 'eip155:1:0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb',
      }),
      { stateSettings: withBlockies },
    );

    expect(getByTestId('snap-ui-avatar')).toBeOnTheScreen();
    expect(
      getByText(shortenString('0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb')),
    ).toBeOnTheScreen();
    expect(UNSAFE_getByType(Image).props.source.uri).toBe(
      toDataUrl('0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb'),
    );
  });

  it('renders Bitcoin address', () => {
    const { getByTestId, getByText } = renderInterface(
      Address({
        address:
          'bip122:000000000019d6689c085ae165831e93:128Lkh3S7CkDTBZ8W7BbpsN3YYizJMp8p6',
      }),
      { stateSettings: withoutBlockies },
    );

    expect(getByTestId('snap-ui-avatar')).toBeOnTheScreen();
    expect(
      getByText(shortenString('128Lkh3S7CkDTBZ8W7BbpsN3YYizJMp8p6')),
    ).toBeOnTheScreen();
  });

  it('renders Bitcoin address with blockie', () => {
    const { getByTestId, getByText, UNSAFE_getByType } = renderInterface(
      Address({
        address:
          'bip122:000000000019d6689c085ae165831e93:128Lkh3S7CkDTBZ8W7BbpsN3YYizJMp8p6',
      }),
      { stateSettings: withBlockies },
    );

    expect(getByTestId('snap-ui-avatar')).toBeOnTheScreen();
    expect(
      getByText(shortenString('128Lkh3S7CkDTBZ8W7BbpsN3YYizJMp8p6')),
    ).toBeOnTheScreen();
    expect(UNSAFE_getByType(Image).props.source.uri).toBe(
      toDataUrl('128Lkh3S7CkDTBZ8W7BbpsN3YYizJMp8p6'),
    );
  });

  it('renders Cosmos address', () => {
    const { getByTestId, getByText } = renderInterface(
      Address({
        address:
          'cosmos:cosmoshub-3:cosmos1t2uflqwqe0fsj0shcfkrvpukewcw40yjj6hdc0',
      }),
      { stateSettings: withoutBlockies },
    );

    expect(getByTestId('snap-ui-avatar')).toBeOnTheScreen();
    expect(
      getByText(shortenString('cosmos1t2uflqwqe0fsj0shcfkrvpukewcw40yjj6hdc0')),
    ).toBeOnTheScreen();
  });

  it('renders Cosmos address with blockie', () => {
    const { getByTestId, getByText, UNSAFE_getByType } = renderInterface(
      Address({
        address:
          'cosmos:cosmoshub-3:cosmos1t2uflqwqe0fsj0shcfkrvpukewcw40yjj6hdc0',
      }),
      { stateSettings: withBlockies },
    );

    expect(getByTestId('snap-ui-avatar')).toBeOnTheScreen();
    expect(
      getByText(shortenString('cosmos1t2uflqwqe0fsj0shcfkrvpukewcw40yjj6hdc0')),
    ).toBeOnTheScreen();
    expect(UNSAFE_getByType(Image).props.source.uri).toBe(
      toDataUrl('cosmos1t2uflqwqe0fsj0shcfkrvpukewcw40yjj6hdc0'),
    );
  });

  it('renders Polkadot address', () => {
    const { getByTestId, getByText } = renderInterface(
      Address({
        address:
          'polkadot:b0a8d493285c2df73290dfb7e61f870f:5hmuyxw9xdgbpptgypokw4thfyoe3ryenebr381z9iaegmfy',
      }),
      { stateSettings: withoutBlockies },
    );

    expect(getByTestId('snap-ui-avatar')).toBeOnTheScreen();
    expect(
      getByText(
        shortenString('5hmuyxw9xdgbpptgypokw4thfyoe3ryenebr381z9iaegmfy'),
      ),
    ).toBeOnTheScreen();
  });

  it('renders Polkadot address with blockie', () => {
    const { getByTestId, getByText, UNSAFE_getByType } = renderInterface(
      Address({
        address:
          'polkadot:b0a8d493285c2df73290dfb7e61f870f:5hmuyxw9xdgbpptgypokw4thfyoe3ryenebr381z9iaegmfy',
      }),
      { stateSettings: withBlockies },
    );

    expect(getByTestId('snap-ui-avatar')).toBeOnTheScreen();
    expect(
      getByText(
        shortenString('5hmuyxw9xdgbpptgypokw4thfyoe3ryenebr381z9iaegmfy'),
      ),
    ).toBeOnTheScreen();
    expect(UNSAFE_getByType(Image).props.source.uri).toBe(
      toDataUrl('5hmuyxw9xdgbpptgypokw4thfyoe3ryenebr381z9iaegmfy'),
    );
  });

  it('renders Starknet address', () => {
    const { getByTestId, getByText } = renderInterface(
      Address({
        address:
          'starknet:SN_GOERLI:0x02dd1b492765c064eac4039e3841aa5f382773b598097a40073bd8b48170ab57',
      }),
      { stateSettings: withoutBlockies },
    );

    expect(getByTestId('snap-ui-avatar')).toBeOnTheScreen();
    expect(
      getByText(
        shortenString(
          '0x02dd1b492765c064eac4039e3841aa5f382773b598097a40073bd8b48170ab57',
        ),
      ),
    ).toBeOnTheScreen();
  });

  it('renders Starknet address with blockie', () => {
    const { getByTestId, getByText, UNSAFE_getByType } = renderInterface(
      Address({
        address:
          'starknet:SN_GOERLI:0x02dd1b492765c064eac4039e3841aa5f382773b598097a40073bd8b48170ab57',
      }),
      { stateSettings: withBlockies },
    );

    expect(getByTestId('snap-ui-avatar')).toBeOnTheScreen();
    expect(
      getByText(
        shortenString(
          '0x02dd1b492765c064eac4039e3841aa5f382773b598097a40073bd8b48170ab57',
        ),
      ),
    ).toBeOnTheScreen();
    expect(UNSAFE_getByType(Image).props.source.uri).toBe(
      toDataUrl(
        '0x02dd1b492765c064eac4039e3841aa5f382773b598097a40073bd8b48170ab57',
      ),
    );
  });

  it('renders Hedera address', () => {
    const { getByTestId, getByText } = renderInterface(
      Address({ address: 'hedera:mainnet:0.0.1234567890-zbhlt' }),
      { stateSettings: withoutBlockies },
    );

    expect(getByTestId('snap-ui-avatar')).toBeOnTheScreen();
    expect(getByText(shortenString('0.0.1234567890-zbhlt'))).toBeOnTheScreen();
  });

  it('renders Hedera address with blockie', () => {
    const { getByTestId, getByText, UNSAFE_getByType } = renderInterface(
      Address({ address: 'hedera:mainnet:0.0.1234567890-zbhlt' }),
      { stateSettings: withBlockies },
    );

    expect(getByTestId('snap-ui-avatar')).toBeOnTheScreen();
    expect(getByText(shortenString('0.0.1234567890-zbhlt'))).toBeOnTheScreen();
    expect(UNSAFE_getByType(Image).props.source.uri).toBe(
      toDataUrl('0.0.1234567890-zbhlt'),
    );
  });
});
