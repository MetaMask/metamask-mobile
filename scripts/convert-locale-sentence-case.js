/* eslint-disable no-console */
/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/no-commonjs */

/**
 * One-time script to convert English locale strings to sentence case
 * while preserving special terms and acronyms.
 *
 * Usage:
 *   node scripts/convert-locale-sentence-case.js --dry-run    # Preview changes
 *   node scripts/convert-locale-sentence-case.js --apply      # Apply changes
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../locales');
const EN_LOCALE_PATH = path.join(LOCALES_DIR, 'languages/en.json');
const EXCEPTIONS_PATH = path.join(LOCALES_DIR, 'sentence-case-exceptions.json');

// Load exceptions
const sentenceCaseExceptions = require(EXCEPTIONS_PATH);

// Helper function to check if text contains special case terms
function containsSpecialCase(text, exceptions) {
  // Check exact matches
  for (const term of exceptions.exactMatches) {
    if (text.includes(term)) {
      return true;
    }
  }

  // Check acronyms
  for (const acronym of exceptions.acronyms) {
    if (text.includes(acronym)) {
      return true;
    }
  }

  // Check patterns
  for (const pattern of Object.values(exceptions.patterns)) {
    if (new RegExp(pattern).test(text)) {
      return true;
    }
  }

  return false;
}

// Helper function to detect title case violations
function hasTitleCaseViolation(text) {
  // Remove quoted text (single quotes and escaped double quotes) before checking
  // Quoted text refers to UI elements and should preserve capitalization
  let textWithoutQuotes = text.replace(/'[^']*'/g, ''); // Remove 'text'
  textWithoutQuotes = textWithoutQuotes.replace(/\\"[^"]*\\"/g, ''); // Remove \"text\"

  // Remove interpolations before checking
  textWithoutQuotes = textWithoutQuotes.replace(/\{\{[^}]+\}\}/g, '');

  // Ignore single words
  const words = textWithoutQuotes.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 2) {
    return false;
  }

  // Ignore if text contains acronyms (2+ consecutive capital letters)
  // Examples: AES, USD, API, etc.
  if (/[A-Z]{2,}/.test(textWithoutQuotes)) {
    return false;
  }

  // Check if multiple words start with capital letters (Title Case pattern)
  // This pattern: "Word Word" or "Word Word Word"
  const titleCasePattern = /^([A-Z][a-z]+\s+)+[A-Z][a-z]+/;

  // Also catch patterns like "In Progress", "Not Available"
  const multipleCapsPattern = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/;

  return titleCasePattern.test(textWithoutQuotes) || multipleCapsPattern.test(textWithoutQuotes);
}

// Simple sentence case conversion
function convertToSentenceCase(text) {
  if (!text) return text;

  // Extract quoted text, interpolations, and other special patterns to preserve them
  const preservedTexts = [];
  const placeholder = '___PRESERVED___';
  let textToProcess = text;

  // Find all interpolations {{...}} and replace with placeholders
  textToProcess = textToProcess.replace(/\{\{[^}]+\}\}/g, (match) => {
    preservedTexts.push(match); // Store the full match including braces
    return placeholder;
  });

  // Find all single-quoted text and replace with placeholders
  textToProcess = textToProcess.replace(/'([^']*)'/g, (match) => {
    preservedTexts.push(match); // Store the full match including quotes
    return placeholder;
  });

  // Find all escaped double-quoted text and replace with placeholders
  textToProcess = textToProcess.replace(/\\"([^"]*)\\" /g, (match) => {
    preservedTexts.push(match); // Store the full match including escaped quotes
    return placeholder;
  });

  // Convert to sentence case
  const words = textToProcess.split(/\s+/);
  let converted = words.map((word, index) => {
    if (word === placeholder) {
      return placeholder;
    }
    if (index === 0) {
      // First word: capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    // Check if previous word ended with sentence-ending punctuation (. ! ?)
    const prevWord = index > 0 ? words[index - 1] : '';
    if (prevWord.match(/[.!?]$/)) {
      // Start of new sentence: capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    // Other words: all lowercase
    return word.toLowerCase();
  }).join(' ');

  // Restore preserved text (replace first occurrence for each preserved text in order)
  let restoredIndex = 0;
  while (converted.includes(placeholder) && restoredIndex < preservedTexts.length) {
    converted = converted.replace(placeholder, preservedTexts[restoredIndex]);
    restoredIndex++;
  }

  return converted;
}

// Helper function to convert to sentence case while preserving special cases
function toSentenceCase(text, exceptions) {
  // If text contains special cases, we need to be careful
  if (containsSpecialCase(text, exceptions)) {
    // Build a map of special terms and their positions
    const specialTerms = [];

    // Find all special terms
    for (const term of exceptions.exactMatches) {
      let index = text.indexOf(term);
      while (index !== -1) {
        specialTerms.push({ term, start: index, end: index + term.length });
        index = text.indexOf(term, index + 1);
      }
    }

    for (const acronym of exceptions.acronyms) {
      let index = text.indexOf(acronym);
      while (index !== -1) {
        specialTerms.push({ term: acronym, start: index, end: index + acronym.length });
        index = text.indexOf(acronym, index + 1);
      }
    }

    // Sort by position
    specialTerms.sort((a, b) => a.start - b.start);

    // Build result preserving special terms
    let result = '';
    let lastIndex = 0;

    for (const special of specialTerms) {
      // Process text before this special term
      const before = text.substring(lastIndex, special.start);
      if (before) {
        result += convertToSentenceCase(before);
      }
      // Add the special term as-is
      result += special.term;
      lastIndex = special.end;
    }

    // Process remaining text
    if (lastIndex < text.length) {
      result += convertToSentenceCase(text.substring(lastIndex));
    }

    return result;
  }

  return convertToSentenceCase(text);
}

// Recursively process nested locale object
function recursivelyConvertLocale(obj, exceptions, path = []) {
  const changes = [];

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = [...path, key];
    const pathStr = currentPath.join('.');

    if (typeof value === 'string') {
      // This is a leaf node - check and convert if needed
      // Skip if contains special cases
      if (containsSpecialCase(value, exceptions)) {
        continue;
      }

      // Check for title case violations
      if (hasTitleCaseViolation(value)) {
        const suggested = toSentenceCase(value, exceptions);
        if (suggested !== value) {
          changes.push({
            path: pathStr,
            original: value,
            converted: suggested,
          });
          obj[key] = suggested;
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively process nested objects
      const nestedChanges = recursivelyConvertLocale(value, exceptions, currentPath);
      changes.push(...nestedChanges);
    }
  }

  return changes;
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isApply = args.includes('--apply');

  if (!isDryRun && !isApply) {
    console.error('Error: Please specify --dry-run or --apply');
    console.error('Usage:');
    console.error('  node scripts/convert-locale-sentence-case.js --dry-run    # Preview changes');
    console.error('  node scripts/convert-locale-sentence-case.js --apply      # Apply changes');
    process.exit(1);
  }

  console.log('Loading English locale file...');
  const enLocale = require(EN_LOCALE_PATH);

  console.log('Loading sentence case exceptions...');
  const exceptions = sentenceCaseExceptions;

  console.log('Processing locale strings...\n');

  // Make a deep copy for processing
  const processedLocale = JSON.parse(JSON.stringify(enLocale));
  const changes = recursivelyConvertLocale(processedLocale, exceptions);

  // Report changes
  console.log(`Found ${changes.length} strings to convert:\n`);

  if (changes.length > 0) {
    changes.forEach((change, index) => {
      console.log(`${index + 1}. ${change.path}`);
      console.log(`   Before: "${change.original}"`);
      console.log(`   After:  "${change.converted}"`);
      console.log('');
    });

    if (isDryRun) {
      console.log('DRY RUN: No changes were written to disk.');
      console.log('Run with --apply to apply these changes.');
    } else if (isApply) {
      console.log('Writing updated locale file...');
      fs.writeFileSync(
        EN_LOCALE_PATH,
        JSON.stringify(processedLocale, null, '  ') + '\n',
      );
      console.log(`✅ Successfully updated ${EN_LOCALE_PATH}`);
      console.log(`   Converted ${changes.length} strings to sentence case.`);
    }
  } else {
    console.log('✅ All strings are already in sentence case!');
  }
}

// Run the script
try {
  main();
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
