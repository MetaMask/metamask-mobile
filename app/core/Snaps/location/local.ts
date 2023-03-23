/* eslint-disable import/prefer-default-export */
import {
  SnapIdPrefixes,
  SnapManifest,
  VirtualFile,
<<<<<<< HEAD
<<<<<<< HEAD
  LocalSnapIdStruct,
} from '@metamask/snaps-utils';
import { HttpLocation, HttpOptions } from './http';
import { SnapLocation } from './location';
import { assert, assertStruct } from '@metamask/utils';
=======
=======
  LocalSnapIdStruct,
>>>>>>> e6eb204b2 ([FEATURE] Create detectSnapLocation method to install a Snap From NPM iOS (#5926))
} from '@metamask/snaps-utils';
import { HttpLocation, HttpOptions } from './http';
import { SnapLocation } from './location';
<<<<<<< HEAD
>>>>>>> 639b9bd4a ([FEATURE] Create detectSnapLocation method to install a Local Snap (#5923))
=======
import { assert, assertStruct } from '@metamask/utils';
>>>>>>> e6eb204b2 ([FEATURE] Create detectSnapLocation method to install a Snap From NPM iOS (#5926))

export class LocalLocation implements SnapLocation {
  readonly #http: HttpLocation;

  constructor(url: URL, opts: HttpOptions = {}) {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> e6eb204b2 ([FEATURE] Create detectSnapLocation method to install a Snap From NPM iOS (#5926))
    assertStruct(url.toString(), LocalSnapIdStruct, 'Invalid Snap Id');
    // TODO(ritave): Write deepMerge() which merges fetchOptions.
    assert(
      opts.fetchOptions === undefined,
      'Currently adding fetch options to local: is unsupported.',
    );
<<<<<<< HEAD
=======
    // TODO get the asserts working from @metamask/utils
    // assertStruct(url.toString(), LocalSnapIdStruct, 'Invalid Snap Id');
    // // TODO(ritave): Write deepMerge() which merges fetchOptions.
    // assert(
    //   opts.fetchOptions === undefined,
    //   'Currently adding fetch options to local: is unsupported.',
    // );
>>>>>>> 639b9bd4a ([FEATURE] Create detectSnapLocation method to install a Local Snap (#5923))
=======
>>>>>>> e6eb204b2 ([FEATURE] Create detectSnapLocation method to install a Snap From NPM iOS (#5926))

    this.#http = new HttpLocation(
      new URL(url.toString().slice(SnapIdPrefixes.local.length)),
      opts,
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
<<<<<<< HEAD
<<<<<<< HEAD
  assert(vfile.data.canonicalPath !== undefined);
=======
  //TODO get the asserts working from @metamask/utils
  //   assert(vfile.data.canonicalPath !== undefined);
>>>>>>> 639b9bd4a ([FEATURE] Create detectSnapLocation method to install a Local Snap (#5923))
=======
  assert(vfile.data.canonicalPath !== undefined);
>>>>>>> e6eb204b2 ([FEATURE] Create detectSnapLocation method to install a Snap From NPM iOS (#5926))
  vfile.data.canonicalPath = `local:${vfile.data.canonicalPath}`;
  return vfile;
}
