import React from 'react';
import { render } from '@testing-library/react-native';

import TestForm from './Form';

describe('TestForm', () => {
  it('renders correctly', () => {
    const wrapper = render(
      <TestForm
        title={'random title'}
        textFields={[
          { placeholder: 'random placeholder', testId: 'random-test-id' },
        ]}
        buttonLabel={'random button label'}
        callback={() => jest.fn()}
        callbackTestId={'random-callback-test-id'}
        responseTestId={'random-response-test-id'}
        styles={{
          container: {},
          title: {},
          textFieldsContainer: {},
          textField: {},
          button: {},
          response: {},
        }}
      />,
    );

    expect(wrapper).toMatchSnapshot();
  });
});
