/** Prints an illustration prompt without generating an image or writing files. */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Combines the shared prompt with the selected pack's art direction. */
async function main(): Promise<void> {
  const [code, ...extra] = process.argv.slice(2);
  if (!code || extra.length > 0)
    throw new Error('Usage: print-prompt.ts <pack-code>');
  const manifest: {
    prompt: string;
    packs: { code: string; subject: string }[];
  } = JSON.parse(
    await readFile(resolve(ROOT, 'catalog/art-direction.json'), 'utf8'),
  );
  const pack = manifest.packs.find((entry) => entry.code === code);
  if (!pack) throw new Error(`Unknown pack code: ${code}`);
  const document = await readFile(resolve(ROOT, manifest.prompt), 'utf8');
  const prompt = document.match(/```text\n([\s\S]*?)\n```/u)?.[1];
  if (!prompt || prompt.match(/\{\{subject\}\}/gu)?.length !== 1)
    throw new Error('The shared prompt must contain exactly one {{subject}}.');
  process.stdout.write(
    `${prompt.replace('{{subject}}', () => pack.subject)}\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
