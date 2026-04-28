import React from 'react';
import { render } from '@testing-library/react-native';

import TestForm from './Form';

describe('TestForm', () => {
  it('renders correctly', () => {
    const { getByText, getByTestId } = render(
      <TestForm
        title={'random title'}
        textFields={[
          { placeholder: 'random placeholder', testId: 'random-test-id' },
        ]}
        buttonLabel={'random button label'}
        callback={() => jest.fn()}
        callbackTestId={'random-callback-test-id'}
        responseTestId={'random-response-test-id'}
        responseTextTestId={'random-response-text-test-id'}
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

    getByText('random title');
    getByTestId('random-callback-test-id');
  });
});
