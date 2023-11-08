import * as fs from 'fs';
const { removeFencedCode } = require('./remove-fenced-code');

const fencedSrc = './app/__mocks__/fenced-code-comp.mock.js';
const noFencedSrc = './app/__mocks__/no-fenced-code-comp.mock.js';
const malFormedFencedSrc = './app/__mocks__/malformed-fenced-code-comp.mock.js';

const fencedContent = fs.readFileSync(fencedSrc, {
  encoding: 'utf-8',
});

const noFencedContent = fs.readFileSync(noFencedSrc, {
  encoding: 'utf-8',
});

const malformedFencedContent = fs.readFileSync(malFormedFencedSrc, {
  encoding: 'utf-8',
});

const features = { all: new Set(['flask']), active: new Set([]) };

describe('removeFencedCode', () => {
  it('should return the unmodified file contents if no fenced code is present', () => {
    const [_, didModify] = removeFencedCode(noFencedSrc, features, noFencedContent);
    expect(didModify).toBe(false);
  });

  it('should remove fenced code', () => {
    const [processedSource, didModify] = removeFencedCode(fencedSrc, features, fencedContent );
    expect(processedSource).toBe(noFencedContent);
    expect(didModify).toBe(true);
  });

  it('should throw an error if a fence is empty', () => {
    expect(() => {
      removeFencedCode(malFormedFencedSrc, features, malformedFencedContent);
    }).toThrow(/Invalid fence line in file/);
  });

  it('should throw an error if a fence is malformed', () => {
    expect(() => {
      removeFencedCode(malFormedFencedSrc, features, malformedFencedContent);
    }).toThrow(/Line contains invalid directive terminus \"ENDED\"/);
  });
});
