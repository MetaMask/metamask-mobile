// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import SheetBottomConfirmation from './SheetBottomConfirmation';

describe('ModalConfirmation', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <SheetBottomConfirmation
        route={{
          params: {
            onConfirm: () => null,
            title: 'Title!',
            description: 'Description.',
            onCancel: () => null,
          },
        }}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
