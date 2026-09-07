/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs';
import {
  clearQualityGateFailures,
  hasQualityGateFailure,
  markQualityGateFailure,
} from './helpers.ts';

describe('quality gate failure registry', () => {
  beforeEach(() => {
    clearQualityGateFailures();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    clearQualityGateFailures();
  });

  it('does not depend on reading and rewriting shared registry contents', () => {
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('concurrent partial write');
    });

    markQualityGateFailure('android-smoke::first test');

    expect(hasQualityGateFailure('android-smoke::first test')).toBe(true);
  });
});
