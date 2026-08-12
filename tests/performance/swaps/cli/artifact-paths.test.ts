/* eslint-disable import-x/no-nodejs-modules */
import { join } from 'node:path';
import { resolveArtifactOutputPaths } from './artifact-paths';

describe('Swaps performance artifact paths', () => {
  it('groups the JSON and Markdown artifacts under the run commit', () => {
    const outputDirectory = join('test-reports', 'swaps-performance');

    const paths = resolveArtifactOutputPaths(
      outputDirectory,
      '2026-08-12T14:30:00.000Z',
      'abc1234',
      'swaps-perf-001-run',
    );

    expect(paths).toEqual({
      directory: join(process.cwd(), outputDirectory, '2026-08-12-abc1234'),
      jsonPath: join(
        process.cwd(),
        outputDirectory,
        '2026-08-12-abc1234',
        'swaps-perf-001-run.json',
      ),
      markdownPath: join(
        process.cwd(),
        outputDirectory,
        '2026-08-12-abc1234',
        'swaps-perf-001-run.md',
      ),
    });
  });
});
