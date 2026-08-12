/* eslint-disable import-x/no-nodejs-modules */
import { resolve } from 'node:path';

export interface ArtifactOutputPaths {
  directory: string;
  jsonPath: string;
  markdownPath: string;
}

export function resolveArtifactOutputPaths(
  outputDirectory: string,
  createdAt: string,
  commit: string,
  runId: string,
): ArtifactOutputPaths {
  const runDate = createdAt.slice(0, 10);
  const directory = resolve(outputDirectory, `${runDate}-${commit}`);

  return {
    directory,
    jsonPath: resolve(directory, `${runId}.json`),
    markdownPath: resolve(directory, `${runId}.md`),
  };
}
