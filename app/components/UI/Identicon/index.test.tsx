import React from 'react';
import Identicon from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar';

const ADDRESS_MOCK = '0x123';
const URI_MOCK = 'https://example.com/image.png';

describe('Identicon', () => {
  it('renders Blockie from address', () => {
    const wrapper = renderWithProvider(<Identicon address={ADDRESS_MOCK} />, {
      state: {
        settings: { avatarAccountType: AvatarAccountType.Blockies },
      },
    });

    expect(wrapper).toMatchSnapshot();
  });

  it('renders Jazzicon', () => {
    const wrapper = renderWithProvider(<Identicon address={ADDRESS_MOCK} />, {
      state: {
        settings: { avatarAccountType: AvatarAccountType.JazzIcon },
      },
    });

    expect(wrapper).toMatchSnapshot();
  });

  it('renders Maskicon', () => {
    const wrapper = renderWithProvider(<Identicon address={ADDRESS_MOCK} />, {
      state: {
        settings: { avatarAccountType: AvatarAccountType.Maskicon },
      },
    });

    expect(wrapper).toMatchSnapshot();
  });

  it('renders custom URI', () => {
    const wrapper = renderWithProvider(<Identicon imageUri={URI_MOCK} />);
    expect(wrapper).toMatchSnapshot();
  });
});
