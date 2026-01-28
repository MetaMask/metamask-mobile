/**
 * Tool Registry
 *
 * Defines the schema for all AI tools.
 * Uses provider-agnostic LLMTool type.
 */

import { LLMTool } from '../providers';
import { TOOL_LIMITS } from '../config';

/**
 * Gets all tool definitions for the AI agent
 */
export function getToolDefinitions(): LLMTool[] {
  return [
    {
      name: 'read_file',
      description:
        'Read the full content of a changed file to understand modifications',
      input_schema: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Path to file (e.g. "app/core/Engine.ts")',
          },
          lines_limit: {
            type: 'number',
            description: `Max lines to read (default: ${TOOL_LIMITS.readFileMaxLines})`,
            default: TOOL_LIMITS.readFileMaxLines,
          },
        },
        required: ['file_path'],
      },
    },
    {
      name: 'get_git_diff',
      description: 'Get git diff for a file to see exact changes',
      input_schema: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Path to file',
          },
          lines_limit: {
            type: 'number',
            description: `Max diff lines (default: ${TOOL_LIMITS.gitDiffMaxLines})`,
            default: TOOL_LIMITS.gitDiffMaxLines,
          },
        },
        required: ['file_path'],
      },
    },
    {
      name: 'find_related_files',
      description:
        'Find files related to a changed file to understand change impact depth. Example: for CI files finds workflows that call reusable workflows, scripts used in workflows, or workflows using specific scripts. For code files: finds importers, dependencies, tests.',
      input_schema: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Path to the changed file',
          },
          search_type: {
            type: 'string',
            enum: ['importers', 'imports', 'tests', 'module', 'ci', 'all'],
            description:
              'Type of related files: importers (who uses this code), imports (what this uses), tests (test files), module (same directory), ci (CI relationships - reusable workflow callers, script usage), all (comprehensive)',
          },
          max_results: {
            type: 'number',
            description: `Max files to return (default: ${TOOL_LIMITS.relatedFilesMaxResults})`,
            default: TOOL_LIMITS.relatedFilesMaxResults,
          },
        },
        required: ['file_path', 'search_type'],
      },
    },
    {
      name: 'list_directory',
      description:
        'List files and subdirectories in a directory to understand module structure and context',
      input_schema: {
        type: 'object',
        properties: {
          directory: {
            type: 'string',
            description: 'Path to directory (e.g. "app/core/")',
          },
        },
        required: ['directory'],
      },
    },
    {
      name: 'grep_codebase',
      description:
        'Search for patterns across the codebase to find usage, dependencies, or references',
      input_schema: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description:
              'Pattern to search for (e.g. "import.*Engine", "useWallet", "export.*function")',
          },
          file_pattern: {
            type: 'string',
            description:
              'File pattern to search in (e.g. "*.tsx", "*.ts", "*"). Default: "*"',
            default: '*',
          },
          max_results: {
            type: 'number',
            description: `Max results to return (default: ${TOOL_LIMITS.grepMaxResults})`,
            default: TOOL_LIMITS.grepMaxResults,
          },
        },
        required: ['pattern'],
      },
    },
    {
      name: 'load_skill',
      description:
        'Load a domain expertise skill to assist with analysis. Use this when you need specialized knowledge for specific areas.',
      input_schema: {
        type: 'object',
        properties: {
          skill_name: {
            type: 'string',
            description:
              'Name of the skill to load (see AVAILABLE SKILLS in system prompt)',
          },
        },
        required: ['skill_name'],
      },
    },
    {
      name: 'finalize_tag_selection',
      description:
        'Submit final tag selection decision for both E2E tests and performance tests',
      input_schema: {
        type: 'object',
        properties: {
          selected_tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'E2E test tags to run',
          },
          risk_level: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
          },
          confidence: {
            type: 'number',
            description: 'Confidence 0-100',
          },
          reasoning: {
            type: 'string',
            description: 'Detailed reasoning for E2E test selection',
          },
          areas: {
            type: 'array',
            items: { type: 'string' },
            description: 'Impacted areas',
          },
          performance_tests: {
            type: 'object',
            description:
              'Performance test selection based on performance impact (empty selected_tags means no performance tests)',
            properties: {
              selected_tags: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'Performance test tags to run (empty array if no performance tests needed)',
              },
              reasoning: {
                type: 'string',
                description: 'Reasoning for performance test selection',
              },
            },
            required: ['selected_tags', 'reasoning'],
          },
        },
        required: [
          'selected_tags',
          'risk_level',
          'confidence',
          'reasoning',
          'areas',
          'performance_tests',
        ],
      },
    },
  ];
}
