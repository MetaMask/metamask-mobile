/**
 * Tool Registry
 *
 * Defines the schema for all AI tools
 */

import Anthropic from '@anthropic-ai/sdk';

/**
 * Gets all tool definitions for the AI agent
 */
export function getToolDefinitions(): Anthropic.Tool[] {
  return [
    {
      name: 'read_file',
      description: 'Read the full content of a changed file to understand modifications',
      input_schema: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Path to file (e.g. "app/core/Engine.ts")'
          },
          lines_limit: {
            type: 'number',
            description: 'Max lines to read (default: 2000)',
            default: 2000
          }
        },
        required: ['file_path']
      }
    },
    {
      name: 'get_git_diff',
      description: 'Get git diff for a file to see exact changes',
      input_schema: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Path to file'
          },
          lines_limit: {
            type: 'number',
            description: 'Max diff lines (default: 1000)',
            default: 1000
          }
        },
        required: ['file_path']
      }
    },
    {
      name: 'get_pr_diff',
      description: 'Get full PR diff from GitHub (for analyzing live PRs)',
      input_schema: {
        type: 'object',
        properties: {
          pr_number: {
            type: 'number',
            description: 'PR number to fetch'
          },
          files: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific files to get diff for (optional)'
          }
        },
        required: ['pr_number']
      }
    },
    {
      name: 'find_related_files',
      description:
        'Find files related to a changed file to understand change impact depth. For CI files: finds workflows that call reusable workflows, scripts used in workflows, or workflows using specific scripts. For code files: finds importers, dependencies, tests.',
      input_schema: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Path to the changed file'
          },
          search_type: {
            type: 'string',
            enum: ['importers', 'imports', 'tests', 'module', 'ci', 'all'],
            description:
              'Type of related files: importers (who uses this code), imports (what this uses), tests (test files), module (same directory), ci (CI relationships - reusable workflow callers, script usage), all (comprehensive)'
          },
          max_results: {
            type: 'number',
            description: 'Max files to return (default: 20)',
            default: 20
          }
        },
        required: ['file_path', 'search_type']
      }
    },
    {
      name: 'finalize_decision',
      description: 'Submit final tag selection decision',
      input_schema: {
        type: 'object',
        properties: {
          selected_tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags to run'
          },
          risk_level: {
            type: 'string',
            enum: ['low', 'medium', 'high']
          },
          confidence: {
            type: 'number',
            description: 'Confidence 0-100'
          },
          reasoning: {
            type: 'string',
            description: 'Detailed reasoning'
          },
          areas: {
            type: 'array',
            items: { type: 'string' },
            description: 'Affected areas'
          }
        },
        required: ['selected_tags', 'risk_level', 'confidence', 'reasoning', 'areas']
      }
    }
  ];
}
