module.exports = function(results) {
  let output = '';
  let errorCount = 0;
  let warningCount = 0;
  let fixableErrorCount = 0;
  let fixableWarningCount = 0;

  // ANSI color codes (same as ESLint's stylish formatter)
  const chalk = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    underline: '\x1b[4m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    gray: '\x1b[90m',
  };

  function color(text, colorCode) {
    return `${colorCode}${text}${chalk.reset}`;
  }

  // Collect all warnings and errors with their file info
  const warnings = [];
  const errors = [];

  results.forEach(result => {
    if (result.messages && result.messages.length > 0) {
      result.messages.forEach(msg => {
        const item = {
          filePath: result.filePath,
          line: msg.line || 0,
          column: msg.column || 0,
          message: msg.message,
          ruleId: msg.ruleId,
          severity: msg.severity,
          fix: msg.fix
        };

        if (msg.severity === 1) {
          warnings.push(item);
          warningCount++;
          if (msg.fix) fixableWarningCount++;
        } else {
          errors.push(item);
          errorCount++;
          if (msg.fix) fixableErrorCount++;
        }
      });
    }
  });

  // Group by file and display warnings first
  function displayMessages(messages) {
    const fileGroups = {};

    // Group messages by file
    messages.forEach(msg => {
      if (!fileGroups[msg.filePath]) {
        fileGroups[msg.filePath] = [];
      }
      fileGroups[msg.filePath].push(msg);
    });

    // Display each file's messages
    Object.keys(fileGroups).forEach(filePath => {
      output += '\n' + color(filePath, chalk.underline) + '\n';

      fileGroups[filePath].forEach(msg => {
        const line = String(msg.line).padStart(3);
        const column = String(msg.column).padStart(3);
        const type = msg.severity === 1 ?
          color('warning', chalk.yellow) :
          color('error', chalk.red);
        const ruleId = msg.ruleId ? color(`  ${msg.ruleId}`, chalk.gray) : '';

        output += `  ${color(`${line}:${column}`, msg.severity === 1 ? chalk.yellow : chalk.red)}  ${type}  ${msg.message}${ruleId}\n`;
      });
    });
  }

  // Display warnings first, then errors
  if (warnings.length > 0) {
    displayMessages(warnings);
  }

  if (errors.length > 0) {
    displayMessages(errors);
  }

  // Summary (exactly like ESLint's default)
  if (errorCount > 0 || warningCount > 0) {
    output += '\n';

    const totalProblems = errorCount + warningCount;
    const totalFixable = fixableErrorCount + fixableWarningCount;

    let summaryColor = chalk.red;
    if (errorCount === 0) {
      summaryColor = chalk.yellow;
    }

    output += color(`✖ ${totalProblems} problem${totalProblems !== 1 ? 's' : ''}`, summaryColor);

    if (errorCount > 0 && warningCount > 0) {
      output += color(` (${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warningCount} warning${warningCount !== 1 ? 's' : ''})`, summaryColor);
    } else if (errorCount > 0) {
      output += color(` (${errorCount} error${errorCount !== 1 ? 's' : ''})`, summaryColor);
    } else {
      output += color(` (${warningCount} warning${warningCount !== 1 ? 's' : ''})`, summaryColor);
    }

    if (totalFixable > 0) {
      output += color(`\n  ${totalFixable} error${totalFixable !== 1 ? 's' : ''} and 0 warnings potentially fixable with the \`--fix\` option.`, chalk.gray);
    }

    output += '\n';
  }

  return output;
};
