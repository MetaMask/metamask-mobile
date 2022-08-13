// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { AvatarAccountType } from '../../Avatars/AvatarAccount';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_CELL_ACCOUNT_TITLE,
} from '../CellAccountContent/CellAccountContent.constants';

// Internal dependencies.
import CellAccountBaseItem from './CellAccountBaseItem';

describe('CellAccountBaseItem - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <CellAccountBaseItem
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
