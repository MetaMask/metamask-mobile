import { ResultComponent } from '@metamask/approval-controller';
import { processError, processHeader, processString } from './util';

const FALLBACK_MESSAGE = 'Fallback Message';
const mockResultComponent: ResultComponent = {
  key: 'mock-key',
  name: 'Text',
  properties: { message: 'mock1', message2: 'mock2' },
  children: 'Mock child',
};

const expectedTemplateRendererComponent = {
  key: 'mock-key',
  props: {
    message: 'mock1',
    message2: 'mock2',
  },
  children: 'Mock child',
  element: 'Text',
};

describe('processHeader', () => {
  it('returns TemplateRendererComponent[] with Text component when input is an array of strings', () => {
    const MOCK_MESSAGE = 'Mock Message';
    const result = processHeader([MOCK_MESSAGE]);
    expect(result).toEqual([MOCK_MESSAGE]);
  });
  it('returns TemplateRendererComponent[] when input is a ResultComponent[]', () => {
    const result = processHeader([
      mockResultComponent,
      { ...mockResultComponent, key: 'mock-key-1' },
    ]);
    expect(result).toEqual([
      expectedTemplateRendererComponent,
      { ...expectedTemplateRendererComponent, key: 'mock-key-1' },
    ]);
  });

  it('throws when input is a ResultComponent[] and element is not in the safe component list', () => {
    expect(() => {
      processHeader([
        mockResultComponent,
        {
          ...mockResultComponent,
          key: 'mock-key-1',
          name: 'unknown-component',
        },
      ]);
    }).toThrow(
      'unknown-component is not in the safe component list for template renderer',
    );
  });
});

describe('processError', () => {
  it('returns TemplateRendererComponent when input is not defined', () => {
    const result = processError(undefined, FALLBACK_MESSAGE);
    expect(result).toEqual([
      {
        key: FALLBACK_MESSAGE,
        element: 'Text',
        children: FALLBACK_MESSAGE,
      },
    ]);
  });

  it('returns TemplateRendererComponent when input is a string', () => {
    const ERROR_MESSAGE = 'Error Message';
    const result = processError(ERROR_MESSAGE, FALLBACK_MESSAGE);
    expect(result).toEqual([
      {
        key: ERROR_MESSAGE,
        element: 'Text',
        children: ERROR_MESSAGE,
      },
    ]);
  });
  it('returns TemplateRendererComponent when input is a ResultComponent', () => {
    const result = processError(mockResultComponent, FALLBACK_MESSAGE);
    expect(result).toEqual(expectedTemplateRendererComponent);
  });
});

describe('processString', () => {
  it('returns string when input is not defined', () => {
    const result = processString(undefined, FALLBACK_MESSAGE);
    expect(result).toEqual([FALLBACK_MESSAGE]);
  });

  it('returns TemplateRendererComponent when input is a string', () => {
    const result = processString('Hello', FALLBACK_MESSAGE);
    expect(result).toEqual(['Hello']);
  });
  it('returns TemplateRendererComponent when input is a ResultComponent', () => {
    const result = processString(mockResultComponent, FALLBACK_MESSAGE);
    expect(result).toEqual(expectedTemplateRendererComponent);
  });
  it('throws when element is not in the safe component list', () => {
    expect(() => {
      processString(
        {
          ...mockResultComponent,
          name: 'unknown-component',
        },
        FALLBACK_MESSAGE,
      );
    }).toThrow(
      'unknown-component is not in the safe component list for template renderer',
    );
  });
});
