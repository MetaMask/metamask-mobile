import React from 'react';
import { render } from '@testing-library/react-native';

import TestForm from './Form';

describe('TestForm', () => {
  it('renders correctly', () => {
    const { toJSON } = render(
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

    expect(toJSON()).not.toBeNull();
  });
});
