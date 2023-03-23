import {
  SnapManifest,
  VirtualFile,
  NpmSnapFileNames,
  createSnapManifest,
  normalizeRelative,
  HttpSnapIdStruct,
} from '@metamask/snaps-utils';
import { assert, assertStruct } from '@metamask/utils';

import { SnapLocation } from './location';

export interface HttpOptions {
  /**
   * @default fetch
   */
  fetch?: typeof fetch;
  fetchOptions?: RequestInit;
}

export class HttpLocation implements SnapLocation {
  // We keep contents separate because then we can use only one Blob in cache,
  // which we convert to Uint8Array when actually returning the file.
  //
  // That avoids deepCloning file contents.
  // I imagine ArrayBuffers are copy-on-write optimized, meaning
  // in most often case we'll only have one file contents in common case.
  private readonly cache = new Map<
    string,
    { file: VirtualFile; contents: Blob | string }
  >();

  private validatedManifest?: VirtualFile<SnapManifest>;

  private readonly url: URL;

  private readonly fetchFn: typeof fetch;

  private readonly fetchOptions?: RequestInit;

  constructor(url: URL, opts: HttpOptions = {}) {
    assertStruct(url.toString(), HttpSnapIdStruct, 'Invalid Snap Id: ');
    this.fetchFn = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.fetchOptions = opts.fetchOptions;
    this.url = url;
  }

  async manifest(): Promise<VirtualFile<SnapManifest>> {
    if (this.validatedManifest) {
      return this.validatedManifest.clone();
    }

    // jest-fetch-mock doesn't handle new URL(), we need to convert .toString()
    const canonicalPath = new URL(
      NpmSnapFileNames.Manifest,
      this.url.toString(),
    ).toString();
    const contents = await (
      await this.fetchFn(canonicalPath, this.fetchOptions)
    ).text();
    const manifest = JSON.parse(contents);
    const vfile = new VirtualFile<SnapManifest>({
      value: contents,
      result: createSnapManifest(manifest),
      path: NpmSnapFileNames.Manifest,
      data: { canonicalPath },
    });
    this.validatedManifest = vfile;

    return this.manifest();
  }

  async fetch(path: string): Promise<VirtualFile> {
    const relativePath = normalizeRelative(path);
    const cached = this.cache.get(relativePath);
    if (cached !== undefined) {
      const { file, contents } = cached;
      const value = contents.toString();
      const vfile = file.clone();
      vfile.value = value;
      return vfile;
    }

    const canonicalPath = this.toCanonical(relativePath).toString();
    const response = await this.fetchFn(canonicalPath, this.fetchOptions);
    const vfile = new VirtualFile({
      value: '',
      path: relativePath,
      data: { canonicalPath },
    });

    const blob = await response.text();
    assert(
      !this.cache.has(relativePath),
      'Corrupted cache, multiple files with same path.',
    );

    this.cache.set(relativePath, { file: vfile, contents: blob });

    return this.fetch(relativePath);
  }

  get root(): URL {
    return new URL(this.url.toString());
  }

  private toCanonical(path: string): URL {
    assert(!path.startsWith('/'), 'Tried to parse absolute path.');
    return new URL(path, this.url.toString());
  }
}
