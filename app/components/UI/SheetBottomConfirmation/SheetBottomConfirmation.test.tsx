// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import SheetBottomConfirmation from './SheetBottomConfirmation';

jest.mock('@react-navigation/native', () => {
  const navigation = {
    goBack: jest.fn(),
  };
  return {
    ...jest.requireActual<any>('@react-navigation/native'),

    useNavigation: jest.fn(() => navigation),
  };
});

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
