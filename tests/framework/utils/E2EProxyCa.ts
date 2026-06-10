/* eslint-disable import-x/no-nodejs-modules */
import { execFile } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

export type ExecFileCallback = (
  error: Error | null,
  stdout: string | Buffer,
  stderr: string | Buffer,
) => void;

export type ExecFileImpl = (
  file: string,
  args: string[],
  callback: ExecFileCallback,
) => void;

export interface E2EProxyCaFilePaths {
  caDirectory: string;
  certDerPath: string;
  certPemPath: string;
  keyPath: string;
}

export const E2E_PROXY_CA_DIRECTORY = path.resolve(
  process.cwd(),
  '.e2e-proxy-ca',
);

export const getE2EProxyCaFilePaths = (
  caDirectory = E2E_PROXY_CA_DIRECTORY,
): E2EProxyCaFilePaths => ({
  caDirectory,
  certDerPath: path.join(caDirectory, 'proxy-ca.cer'),
  certPemPath: path.join(caDirectory, 'proxy-ca.pem'),
  keyPath: path.join(caDirectory, 'proxy-ca.key'),
});

export const {
  certDerPath: E2E_PROXY_CA_CERT_DER_PATH,
  certPemPath: E2E_PROXY_CA_CERT_PEM_PATH,
  keyPath: E2E_PROXY_CA_KEY_PATH,
} = getE2EProxyCaFilePaths();

const defaultExecFile = execFile as unknown as ExecFileImpl;

const getMissingFiles = (paths: E2EProxyCaFilePaths) =>
  [paths.keyPath, paths.certPemPath, paths.certDerPath].filter(
    (filePath) => !existsSync(filePath),
  );

const runOpenSsl = (args: string[], execFileImpl: ExecFileImpl) =>
  new Promise<void>((resolve, reject) => {
    execFileImpl('openssl', args, (error, _stdout, stderr) => {
      if (!error) {
        resolve();
        return;
      }

      const stderrText = stderr.toString().trim();
      const message = stderrText ? `: ${stderrText}` : '';
      const wrappedError = new Error(
        `Failed to run openssl ${args.join(' ')}${message}`,
      );
      (wrappedError as Error & { cause?: unknown }).cause = error;
      reject(wrappedError);
    });
  });

export const ensureE2EProxyCa = async ({
  caDirectory = E2E_PROXY_CA_DIRECTORY,
  execFileImpl = defaultExecFile,
}: {
  caDirectory?: string;
  execFileImpl?: ExecFileImpl;
} = {}): Promise<E2EProxyCaFilePaths> => {
  const paths = getE2EProxyCaFilePaths(caDirectory);

  if (getMissingFiles(paths).length === 0) {
    return paths;
  }

  mkdirSync(paths.caDirectory, { recursive: true });

  await runOpenSsl(['genrsa', '-out', paths.keyPath, '2048'], execFileImpl);
  await runOpenSsl(
    [
      'req',
      '-x509',
      '-new',
      '-nodes',
      '-key',
      paths.keyPath,
      '-sha256',
      '-days',
      '3650',
      '-subj',
      '/CN=MetaMask Mobile E2E Proxy CA',
      '-out',
      paths.certPemPath,
    ],
    execFileImpl,
  );
  await runOpenSsl(
    [
      'x509',
      '-in',
      paths.certPemPath,
      '-outform',
      'der',
      '-out',
      paths.certDerPath,
    ],
    execFileImpl,
  );

  const missingFiles = getMissingFiles(paths);
  if (missingFiles.length > 0) {
    throw new Error(
      `Failed to generate iOS E2E proxy CA. Missing files: ${missingFiles.join(
        ', ',
      )}`,
    );
  }

  return paths;
};
