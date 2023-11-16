/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/no-commonjs */
/* eslint-disable no-console */
import { readFileSync } from 'fs';
const { removeFencedCode } = require('./remove-fenced-code');

const fencedSrc = './app/__mocks__/fenced-code-comp.mock.js';
const noFencedSrc = './app/__mocks__/no-fenced-code-comp.mock.js';
const malFormedFencedSrc = './app/__mocks__/malformed-fenced-code-comp.mock.js';
const emptyFencedSrc = './app/__mocks__/empty-fenced-code-comp.mock.js';
const invalidParamFencedSrc =
  './app/__mocks__/invalid-param-fenced-comp.mock.js';

const fencedContent = readFileSync(fencedSrc, {
  encoding: 'utf-8',
});

const noFencedContent = readFileSync(noFencedSrc, {
  encoding: 'utf-8',
});

const malformedFencedContent = readFileSync(malFormedFencedSrc, {
  encoding: 'utf-8',
});

const emptyFencedContent = readFileSync(emptyFencedSrc, {
  encoding: 'utf-8',
});

const invalidParamFencedContent = readFileSync(invalidParamFencedSrc, {
  encoding: 'utf-8',
});

const features = { all: new Set(['flask']), active: new Set([]) };

describe('removeFencedCode', () => {
  it('should return the unmodified file contents if no fenced code is present', () => {
    const [, didModify] = removeFencedCode(
      noFencedSrc,
      features,
      noFencedContent,
    );
    expect(didModify).toBe(false);
  });

  it('should remove fenced code', () => {
    const [processedSource, didModify] = removeFencedCode(
      fencedSrc,
      features,
      fencedContent,
    );
    expect(processedSource).toBe(noFencedContent);
    expect(didModify).toBe(true);
  });

  it('should throw an Invalid fence line error for empty or malformed fences', () => {
    let errorMessage;

    try {
      expect(
        removeFencedCode(malFormedFencedSrc, features, malformedFencedContent),
      ).toThrow();
    } catch (error) {
      errorMessage = error.message;
    }

    expect(errorMessage).toMatch(/Invalid fence line in file/);
    expect(errorMessage).toMatch(
      /Line contains invalid directive terminus "ENDED"/,
    );
  });

  it('should throw an Empty fence error if a fence is empty', () => {
    expect(() => {
      removeFencedCode(malFormedFencedSrc, features, emptyFencedContent);
    }).toThrow(/Empty fence found in file/);
  });

  it('should throw an invalid param fence error if a fence is empty', () => {
    let errorMessage;

    try {
      expect(
        removeFencedCode(
          invalidParamFencedSrc,
          features,
          invalidParamFencedContent,
        ),
      ).toThrow();
    } catch (error) {
      errorMessage = error.message;
    }

    expect(errorMessage).toMatch(/Invalid code fence parameters in file/);
    expect(errorMessage).toMatch(
      /"invalidParam" is not a declared build feature\./,
    );
  });
});
