import React from 'react';
import Identicon from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar';

const ADDRESS_MOCK = '0x123';
const URI_MOCK = 'https://example.com/image.png';

describe('Identicon', () => {
  it('renders Blockie from address', () => {
    const { toJSON } = renderWithProvider(
      <Identicon address={ADDRESS_MOCK} />,
      {
        state: {
          settings: { avatarAccountType: AvatarAccountType.Blockies },
        },
      },
    );

    expect(toJSON()).not.toBeNull();
  });

  it('renders Jazzicon', () => {
    const { toJSON } = renderWithProvider(
      <Identicon address={ADDRESS_MOCK} />,
      {
        state: {
          settings: { avatarAccountType: AvatarAccountType.JazzIcon },
        },
      },
    );

    expect(toJSON()).not.toBeNull();
  });

  it('renders Maskicon', () => {
    const { toJSON } = renderWithProvider(
      <Identicon address={ADDRESS_MOCK} />,
      {
        state: {
          settings: { avatarAccountType: AvatarAccountType.Maskicon },
        },
      },
    );

    expect(toJSON()).not.toBeNull();
  });

  it('renders custom URI', () => {
    const { toJSON } = renderWithProvider(<Identicon imageUri={URI_MOCK} />);
    expect(toJSON()).not.toBeNull();
  });
});
