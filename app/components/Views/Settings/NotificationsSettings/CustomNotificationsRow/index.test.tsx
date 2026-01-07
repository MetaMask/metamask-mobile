import React from 'react';
import CustomNotificationsRow from '../CustomNotificationsRow/index';
import { render } from '@testing-library/react-native';
import { IconName } from '../../../../../component-library/components/Icons/Icon';

describe('CustomNotificationsRow', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <CustomNotificationsRow
        title={'Title'}
        icon={IconName.Sparkle}
        isEnabled={false}
        toggleCustomNotificationsEnabled={() => jest.fn()}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
