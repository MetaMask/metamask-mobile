export interface CliArgs {
  update: boolean;
  allowNew: boolean;
  changed: string | null;
  files: string[];
  help: boolean;
}

export const USAGE = `Usage: yarn lint:react-compiler [options] [files...]

Runs babel-plugin-react-compiler over app/ (tests and mocks excluded) in validation-only mode
and compares the failures with scripts/react-compiler-check/baseline.json.

Options:
  --update           Rewrite the baseline for the checked files. Refuses to add failures.
  --allow-new        With --update, also record new or increased failures.
  --changed [ref]    Check only files changed since ref (default origin/main) plus untracked files.
  -h, --help         Show this help.`;

export function parseCliArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    update: false,
    allowNew: false,
    changed: null,
    files: [],
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--update') {
      args.update = true;
    } else if (arg === '--allow-new') {
      args.allowNew = true;
    } else if (arg === '--changed') {
      const next = argv[index + 1];
      if (next && !next.startsWith('-') && !/\.(?:jsx?|tsx?|mjs|cjs)$/i.test(next)) {
        args.changed = next;
        index += 1;
      } else {
        args.changed = 'origin/main';
      }
    } else if (arg.startsWith('--changed=')) {
      args.changed = arg.slice('--changed='.length);
    } else if (arg === '-h' || arg === '--help') {
      args.help = true;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}\n\n${USAGE}`);
    } else {
      args.files.push(arg);
    }
  }
  if (args.allowNew && !args.update) {
    throw new Error('--allow-new only applies together with --update.');
  }
  return args;
}
