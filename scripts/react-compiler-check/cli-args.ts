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
  --changed          Check only files changed since origin/main, plus uncommitted and untracked files.
  --changed=<ref>    Same, against another ref.
  -h, --help         Show this help.`;

export function parseCliArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    update: false,
    allowNew: false,
    changed: null,
    files: [],
    help: false,
  };
  for (const arg of argv) {
    if (arg === '--update') {
      args.update = true;
    } else if (arg === '--allow-new') {
      args.allowNew = true;
    } else if (arg === '--changed') {
      args.changed = 'origin/main';
    } else if (arg.startsWith('--changed=')) {
      args.changed = arg.slice('--changed='.length);
      if (!args.changed || args.changed.startsWith('-')) {
        throw new Error(`Invalid ref for --changed: "${args.changed}"`);
      }
    } else if (arg === '-h' || arg === '--help') {
      args.help = true;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}\n\n${USAGE}`);
    } else {
      args.files.push(arg);
    }
  }
  if (args.changed !== null && args.files.length > 0) {
    throw new Error('Pass either --changed or a list of files, not both.');
  }
  if (args.allowNew && !args.update) {
    throw new Error('--allow-new only applies together with --update.');
  }
  return args;
}
