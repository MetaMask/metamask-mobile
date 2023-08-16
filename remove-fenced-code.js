const hasKey = (obj, key) => Reflect.hasOwnProperty.call(obj, key);

module.exports = {
  removeFencedCode,
  lintTransformedFile
};


const DirectiveTerminuses = {
  BEGIN: 'BEGIN',
  END: 'END',
};

const DirectiveCommands = {
  ONLY_INCLUDE_IN: 'ONLY_INCLUDE_IN',
};

/**
 * Factory function for command validators.
 *
 * @param {{ features: import('./remove-fenced-code').Features }} config - Configuration required for validation.
 * @returns A mapping of command -> validator function.
 */
function CommandValidators({ features }) {
  return {
    [DirectiveCommands.ONLY_INCLUDE_IN]: (params, filePath) => {
      if (!params || params.length === 0) {
        throw new Error(
          getInvalidParamsMessage(
            filePath,
            DirectiveCommands.ONLY_INCLUDE_IN,
            `No params specified.`,
          ),
        );
      }

      for (const param of params) {
        if (!features.all.has(param)) {
          throw new Error(
            getInvalidParamsMessage(
              filePath,
              DirectiveCommands.ONLY_INCLUDE_IN,
              `"${param}" is not a declared build feature.`,
            ),
          );
        }
      }
    },
  };
}

// Matches lines starting with "///:", and any preceding whitespace, except
// newlines. We except newlines to avoid eating blank lines preceding a fenced
// line.
// Double-negative RegEx credit: https://stackoverflow.com/a/3469155
const linesWithFenceRegex = /^[^\S\r\n]*\/\/\/:.*$/gmu;

// Matches the first "///:" in a string, and any preceding whitespace
const fenceSentinelRegex = /^\s*\/\/\/:/u;

// Breaks a fence directive into its constituent components
// At this stage of parsing, we are looking for one of:
// - TERMINUS:COMMAND(PARAMS)
// - TERMINUS:COMMAND
const directiveParsingRegex =
  /^([A-Z]+):([A-Z_]+)(?:\(((?:\w[-\w]*,)*\w[-\w]*)\))?$/u;

/**
 * Removes fenced code from the given JavaScript source string. "Fenced code"
 * includes the entire fence lines, including their trailing newlines, and the
 * lines that they surround.
 *
 * A valid fence consists of two well-formed fence lines, separated by one or
 * more lines that should be excluded. The first line must contain a `BEGIN`
 * directive, and the second most contain an `END` directive. Both directives
 * must specify the same command.
 *
 * Here's an example of a valid fence:
 *
 * ```javascript
 *   ///: BEGIN:ONLY_INCLUDE_IN(build-flask)
 *   console.log('I am Flask.');
 *   ///: END:ONLY_INCLUDE_IN
 * ```
 *
 * For details, please see the documentation.
 *
 * @param {string} filePath - The path to the file being transformed.
 * @param {import('./remove-fenced-code').Features} features - Features that are currently active.
 * @param {string} fileContent - The contents of the file being transformed.
 * @returns {[string, modified]} A tuple of the post-transform file contents and
 * a boolean indicating whether they were modified.
 */
function removeFencedCode(filePath, features, fileContent) {
  // Do not modify the file if we detect an inline sourcemap. For reasons
  // yet to be determined, the transform receives every file twice while in
  // watch mode, the second after Babel has transpiled the file. Babel adds
  // inline source maps to the file, something we will never do in our own
  // source files, so we use the existence of inline source maps to determine
  // whether we should ignore the file.
  if (/^\/\/# sourceMappingURL=/gmu.test(fileContent)) {
    return [fileContent, false];
  }

  // If we didn't match any lines, return the unmodified file contents.
  const matchedLines = [...fileContent.matchAll(linesWithFenceRegex)];

  if (matchedLines.length === 0) {
    return [fileContent, false];
  }

  // Parse fence lines
  const parsedDirectives = matchedLines.map((matchArray) => {
    const line = matchArray[0];

    /* istanbul ignore next: should be impossible */
    if (!fenceSentinelRegex.test(line)) {
      throw new Error(
        getInvalidFenceLineMessage(
          filePath,
          line,
          `Fence sentinel may only appear at the start of a line, optionally preceded by whitespace.`,
        ),
      );
    }

    // Store the start and end indices of each line
    // Increment the end index by 1 to including the trailing newline when
    // performing string operations.
    const indices = [matchArray.index, matchArray.index + line.length + 1];

    const lineWithoutSentinel = line.replace(fenceSentinelRegex, '');
    if (!/^ \w\w+/u.test(lineWithoutSentinel)) {
      throw new Error(
        getInvalidFenceLineMessage(
          filePath,
          line,
          `Fence sentinel must be followed by a single space and an alphabetical string of two or more characters.`,
        ),
      );
    }

    const directiveMatches = lineWithoutSentinel
      .trim()
      .match(directiveParsingRegex);

    if (!directiveMatches) {
      throw new Error(
        getInvalidFenceLineMessage(
          filePath,
          line,
          `Failed to parse fence directive.`,
        ),
      );
    }

    // The first element of a RegEx match array is the input
    const [, terminus, command, parameters] = directiveMatches;

    if (!hasKey(DirectiveTerminuses, terminus)) {
      throw new Error(
        getInvalidFenceLineMessage(
          filePath,
          line,
          `Line contains invalid directive terminus "${terminus}".`,
        ),
      );
    }

    if (!hasKey(DirectiveCommands, command)) {
      throw new Error(
        getInvalidFenceLineMessage(
          filePath,
          line,
          `Line contains invalid directive command "${command}".`,
        ),
      );
    }

    const parsed = {
      line,
      indices,
      terminus,
      command,
    };

    if (parameters !== undefined) {
      parsed.parameters = parameters.split(',');
    }
    return parsed;
  });

  if (parsedDirectives.length % 2 !== 0) {
    throw new Error(
      getInvalidFenceStructureMessage(
        filePath,
        `A valid fence consists of two fence lines, but the file contains an uneven number, "${parsedDirectives.length}", of fence lines.`,
      ),
    );
  }

  // The below for-loop iterates over the parsed fence directives and performs
  // the following work:
  // - Ensures that the array of parsed directives consists of valid directive
  //   pairs, as specified in the documentation.
  // - For each directive pair, determines whether their fenced lines should be
  //   removed for the current build, and if so, stores the indices we will use
  //   to splice the file content string.

  const splicingIndices = [];
  let shouldSplice = false;
  let currentCommand;
  const commandValidators = CommandValidators({ features });

  for (let i = 0; i < parsedDirectives.length; i++) {
    const { line, indices, terminus, command, parameters } =
      parsedDirectives[i];
    if (i % 2 === 0) {
      if (terminus !== DirectiveTerminuses.BEGIN) {
        throw new Error(
          getInvalidFencePairMessage(
            filePath,
            line,
            `The first directive of a pair must be a "BEGIN" directive.`,
          ),
        );
      }

      currentCommand = command;
      // Throws an error if the command parameters are invalid
      commandValidators[command](parameters, filePath);

      const blockIsActive = parameters.some((param) =>
        features.active.has(param),
      );

      if (blockIsActive) {
        shouldSplice = false;
      } else {
        shouldSplice = true;

        // Add start index of BEGIN directive line to splicing indices
        splicingIndices.push(indices[0]);
      }
    } else {
      if (terminus !== DirectiveTerminuses.END) {
        throw new Error(
          getInvalidFencePairMessage(
            filePath,
            line,
            `The second directive of a pair must be an "END" directive.`,
          ),
        );
      }

      /* istanbul ignore next: impossible until there's more than one command */
      if (command !== currentCommand) {
        throw new Error(
          getInvalidFencePairMessage(
            filePath,
            line,
            `Expected "END" directive to have command "${currentCommand}" but found "${command}".`,
          ),
        );
      }

      // Forbid empty fences
      const { line: previousLine, indices: previousIndices } =
        parsedDirectives[i - 1];
      if (fileContent.substring(previousIndices[1], indices[0]).trim() === '') {
        throw new Error(
          `Empty fence found in file "${filePath}":\n${previousLine}\n${line}\n`,
        );
      }

      if (shouldSplice) {
        // Add end index of END directive line to splicing indices
        splicingIndices.push(indices[1]);
      }
    }
  }

  // This indicates that the present build type should include all fenced code,
  // and so we just returned the unmodified file contents.
  if (splicingIndices.length === 0) {
    return [fileContent, false];
  }

  /* istanbul ignore next: should be impossible */
  if (splicingIndices.length % 2 !== 0) {
    throw new Error(
      `Internal error while transforming file "${filePath}":\nCollected an uneven number of splicing indices: "${splicingIndices.length}"`,
    );
  }

  return [multiSplice(fileContent, splicingIndices), true];
}

/**
 * Returns a copy of the given string, without the character ranges specified
 * by the splicing indices array.
 *
 * The splicing indices must be a non-empty, even-length array of non-negative
 * integers, specifying the character ranges to remove from the given string, as
 * follows:
 *
 * `[ start, end, start, end, start, end, ... ]`
 *
 * @param {string} toSplice - The string to splice.
 * @param {number[]} splicingIndices - Indices to splice at.
 * @returns {string} The spliced string.
 */
function multiSplice(toSplice, splicingIndices) {
  const retainedSubstrings = [];

  // Get the first part to be included
  // The substring() call returns an empty string if splicingIndices[0] is 0,
  // which is exactly what we want in that case.
  retainedSubstrings.push(toSplice.substring(0, splicingIndices[0]));

  // This loop gets us all parts of the string that should be retained, except
  // the first and the last.
  // It iterates over all "end" indices of the array except the last one, and
  // pushes the substring between each "end" index and the next "begin" index
  // to the array of retained substrings.
  if (splicingIndices.length > 2) {
    // Note the boundary index of "splicingIndices.length - 1". This loop must
    // not iterate over the last element of the array.
    for (let i = 1; i < splicingIndices.length - 1; i += 2) {
      retainedSubstrings.push(
        toSplice.substring(splicingIndices[i], splicingIndices[i + 1]),
      );
    }
  }

  // Get the last part to be included
  retainedSubstrings.push(
    toSplice.substring(splicingIndices[splicingIndices.length - 1]),
  );
  return retainedSubstrings.join('');
}

/**
 * @param {string} filePath - The path to the file that caused the error.
 * @param {string} line - The contents of the line with the error.
 * @param {string} details - An explanation of the error.
 * @returns The error message.
 */
function getInvalidFenceLineMessage(filePath, line, details) {
  return `Invalid fence line in file "${filePath}": "${line}":\n${details}`;
}

/**
 * @param {string} filePath - The path to the file that caused the error.
 * @param {string} details - An explanation of the error.
 * @returns The error message.
 */
function getInvalidFenceStructureMessage(filePath, details) {
  return `Invalid fence structure in file "${filePath}":\n${details}`;
}

/**
 * @param {string} filePath - The path to the file that caused the error.
 * @param {string} line - The contents of the line with the error.
 * @param {string} details - An explanation of the error.
 * @returns The error message.
 */
function getInvalidFencePairMessage(filePath, line, details) {
  return `Invalid fence pair in file "${filePath}" due to line "${line}":\n${details}`;
}

/**
 * @param {string} filePath - The path to the file that caused the error.
 * @param {string} command - The command of the directive with the invalid
 * parameters.
 * @param {string} details - An explanation of the error.
 * @returns The error message.
 */
function getInvalidParamsMessage(filePath, command, details) {
  return `Invalid code fence parameters in file "${filePath}" for command "${command}":\n${details}`;
}

const { ESLint } = require('eslint');
const eslintrc = require('./.eslintrc');

eslintrc.overrides.forEach((override) => {
  const rules = override.rules ?? {};

  // We don't want linting to fail for purely stylistic reasons.
  rules['prettier/prettier'] = 'off';
  // Sometimes we use `let` instead of `const` to assign variables depending on
  // the build type.
  rules['prefer-const'] = 'off';

  override.rules = rules;
});

// Remove all test-related overrides. We will never lint test files here.
eslintrc.overrides = eslintrc.overrides.filter((override) => {
  return !(
    (override.extends &&
      override.extends.find(
        (configName) =>
          configName.includes('jest') || configName.includes('mocha'),
      )) ||
    (override.plugins &&
      override.plugins.find((pluginName) => pluginName.includes('jest')))
  );
});

/**
 * The singleton ESLint instance.
 *
 * @type {ESLint}
 */
let eslintInstance;

// We only need a single ESLint instance, and we only initialize it if necessary
const initializeESLint = () => {
  if (!eslintInstance) {
    eslintInstance = new ESLint({ baseConfig: eslintrc, useEslintrc: false });
  }
};

// Four spaces
const TAB = '    ';

/**
 * Lints a transformed file by invoking ESLint programmatically on the string
 * file contents. The path to the file must be specified so that the repository
 * ESLint config can be applied properly.
 *
 * An error is thrown if linting produced any errors, or if the file is ignored
 * by ESLint. Files linted by this function should never be ignored.
 *
 * @param {string} content - The file content.
 * @param {string} filePath - The path to the file.
 * @returns {Promise<void>} Returns `undefined` or throws an error if linting produced
 * any errors, or if the linted file is ignored.
 */
async function lintTransformedFile(content, filePath) {
  initializeESLint();

  const lintResult = (
    await eslintInstance.lintText(content, { filePath, warnIgnored: false })
  )[0];

  // This indicates that the file is ignored, which should never be the case for
  // a transformed file.
  if (lintResult === undefined) {
    throw new Error(
      `MetaMask build: Transformed file "${filePath}" appears to be ignored by ESLint.`,
    );
  }

  // This is the success case
  if (lintResult.errorCount === 0) {
    return;
  }

  // Errors are stored in the messages array, and their "severity" is 2
  const errorsString = lintResult.messages
    .filter(({ severity }) => severity === 2)
    .reduce((allErrors, { message, ruleId }) => {
      return allErrors.concat(`${TAB}${ruleId}\n${TAB}${message}\n\n`);
    }, '');

  throw new Error(
    `MetaMask build: Lint errors encountered for transformed file "${filePath}":\n\n${errorsString}`,
  );
}
