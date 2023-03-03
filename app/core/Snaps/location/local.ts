/* eslint-disable import/prefer-default-export */
import {
  LocalSnapIdStruct,
  SnapIdPrefixes,
  SnapManifest,
  VirtualFile,
} from '@metamask/snaps-utils';
// import { assert, assertStruct } from '@metamask/utils';

import { HttpLocation, HttpOptions } from './http';
import { SnapLocation } from './location';

export class LocalLocation implements SnapLocation {
  readonly #http: HttpLocation;

  constructor(url: URL, opts: HttpOptions = {}) {
    console.log('LocalLocation constructor called with ', url, opts);
    // assertStruct(url.toString(), LocalSnapIdStruct, 'Invalid Snap Id');
    // // TODO(ritave): Write deepMerge() which merges fetchOptions.
    // assert(
    //   opts.fetchOptions === undefined,
    //   'Currently adding fetch options to local: is unsupported.',
    // );

    this.#http = new HttpLocation(
      new URL(url.toString().slice(SnapIdPrefixes.local.length)),
      { ...opts, fetchOptions: { cache: 'no-cache' } },
    );
  }

  async manifest(): Promise<VirtualFile<SnapManifest>> {
    const vfile = await this.#http.manifest();

    return convertCanonical(vfile);
  }

  async fetch(path: string): Promise<VirtualFile> {
    return convertCanonical(await this.#http.fetch(path));
  }

  get shouldAlwaysReload() {
    return true;
  }
}

/**
 * Converts vfiles with canonical `http:` paths into `local:` paths.
 *
 * @param vfile - The {@link VirtualFile} to convert.
 * @returns The same object with updated `.data.canonicalPath`.
 */
function convertCanonical<Result>(
  vfile: VirtualFile<Result>,
): VirtualFile<Result> {
//   assert(vfile.data.canonicalPath !== undefined);
  vfile.data.canonicalPath = `local:${vfile.data.canonicalPath}`;
  return vfile;
}
