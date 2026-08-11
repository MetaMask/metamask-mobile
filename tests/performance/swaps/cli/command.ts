export const SWAPS_PERFORMANCE_USAGE = `Usage:
  yarn performance:swaps run --scenario <number-or-id> [scenario options]
  yarn performance:swaps analyze [artifact path | --latest]
  yarn performance:swaps prepare
  yarn performance:swaps status
  yarn performance:swaps cleanup`;

export type SwapsPerformanceCommand =
  | {
      action: 'run';
      scenario: string;
      args: string[];
    }
  | {
      action: 'analyze';
      args: string[];
    }
  | {
      action: 'prepare' | 'status' | 'cleanup';
    };

function parseRunCommand(args: string[]): SwapsPerformanceCommand {
  const scenarioIndexes = args.flatMap((argument, index) =>
    argument === '--scenario' ? [index] : [],
  );
  if (scenarioIndexes.length !== 1) {
    throw new Error(
      `Run requires exactly one --scenario option.\n\n${SWAPS_PERFORMANCE_USAGE}`,
    );
  }

  const scenarioIndex = scenarioIndexes[0];
  const scenario = args[scenarioIndex + 1];
  if (!scenario || scenario.startsWith('--')) {
    throw new Error(
      `--scenario requires a value.\n\n${SWAPS_PERFORMANCE_USAGE}`,
    );
  }

  return {
    action: 'run',
    scenario,
    args: [...args.slice(0, scenarioIndex), ...args.slice(scenarioIndex + 2)],
  };
}

export function parseSwapsPerformanceCommand(
  argv: string[],
): SwapsPerformanceCommand {
  const [action, ...args] = argv;

  if (action === 'run') {
    return parseRunCommand(args);
  }
  if (action === 'analyze') {
    return { action, args };
  }
  if (action === 'prepare' || action === 'status' || action === 'cleanup') {
    if (args.length > 0) {
      throw new Error(
        `${action} does not accept additional arguments.\n\n${SWAPS_PERFORMANCE_USAGE}`,
      );
    }
    return { action };
  }

  throw new Error(SWAPS_PERFORMANCE_USAGE);
}
