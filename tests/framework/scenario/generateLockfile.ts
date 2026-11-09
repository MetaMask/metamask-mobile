/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs';
import path from 'path';
import { bindingCatalog } from './bindingCatalog.ts';
import { buildLock } from './matchSteps.ts';
import { parseScenario } from './ScenarioLoader.ts';

/**
 * Writes `<name>.scenario.lock.json` beside a scenario Markdown file.
 *
 * Usage: yarn scenario:lock [--check] <scenario.scenario.md> [...]
 * `--check` fails when a committed lockfile would change.
 */
function main(): void {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const files = args.filter((arg) => !arg.startsWith('--'));
  if (files.length === 0) {
    console.error(
      'Usage: yarn scenario:lock [--check] tests/performance/login/scenarios/eth-swap-flow.scenario.md',
    );
    process.exitCode = 1;
    return;
  }

  let failed = false;
  for (const file of files) {
    const lockPath = file.replace(/\.md$/, '.lock.json');
    try {
      const scenario = parseScenario(
        fs.readFileSync(file, 'utf8'),
        path.basename(file),
      );
      const json = `${JSON.stringify(buildLock(scenario, bindingCatalog), null, 2)}\n`;
      if (check) {
        const current = fs.existsSync(lockPath)
          ? fs.readFileSync(lockPath, 'utf8')
          : '';
        if (current !== json) {
          console.error(
            `${lockPath} is out of date. Run: yarn scenario:lock ${file}`,
          );
          failed = true;
        } else {
          console.log(`${lockPath} is up to date`);
        }
      } else {
        fs.writeFileSync(lockPath, json);
        console.log(`Wrote ${lockPath}`);
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      failed = true;
    }
  }
  if (failed) {
    process.exitCode = 1;
  }
}

main();
