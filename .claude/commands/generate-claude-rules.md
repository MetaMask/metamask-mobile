## Overview

Generate the CLAUDE.md file by dynamically aggregating all rules from the .cursor/rules/ directory into a single comprehensive document. This command works regardless of which rules exist or are added/removed.

## Steps

1. **Discover all rule files**
   - Dynamically scan `.cursor/rules/` directory for all `.mdc` files
   - Read each rule file to understand its content and structure
   - Extract the title/name from each file (from frontmatter or first heading)
   - Identify the main sections and guidelines in each file

2. **Analyze rule content dynamically**
   - Extract the core content from each rule file (skip frontmatter)
   - Identify overlapping sections and consolidate them automatically
   - Determine the logical order for organizing the content based on content analysis
   - Note any specific formatting or structure requirements
   - Group related content based on semantic analysis

3. **Generate dynamic structure**
   - Create a comprehensive table of contents based on discovered content
   - Organize content into logical sections based on content analysis:
     - Group similar guidelines together
     - Create sections based on the actual content found
     - Ensure all discovered rules are properly integrated
   - Use the rule file names/titles as section headers when appropriate

4. **Consolidate content dynamically**
   - Merge all rule content into appropriate sections based on content analysis
   - Remove duplicates and consolidate similar guidelines automatically
   - Maintain the original formatting and emphasis (bold, code blocks, etc.)
   - Ensure all examples and code snippets are preserved
   - Keep all enforcement rules and mandatory requirements
   - Preserve all unique content from each rule file

5. **Handle CLAUDE.md file existence**
   - Check if CLAUDE.md file already exists
   - If no file exists: Create new CLAUDE.md with consolidated content
   - If file exists: Ask user what to do:
     - **Replace existing**: Overwrite with new consolidated content
     - **Merge existing and new**: Combine existing content with new rules
   - Ensure proper markdown formatting throughout
   - Verify all sections are complete and well-organized
   - Maintain the single source of truth principle
   - Include a note about the dynamic nature of the document

## Checklist

- [ ] All .cursor/rules/ files read and analyzed
- [ ] Content structure and organization planned
- [ ] Overlapping content identified and consolidated
- [ ] CLAUDE.md file existence checked
- [ ] User preference obtained (if file exists)
- [ ] CLAUDE.md created/updated with comprehensive guidelines
- [ ] All original formatting and emphasis preserved
- [ ] All examples and code snippets included
- [ ] Enforcement rules and mandatory requirements maintained
- [ ] Table of contents updated
- [ ] Single source of truth principle maintained

## Dynamic Content Organization

The updated CLAUDE.md should be organized based on the actual content discovered:

1. **Analyze each rule file content**
   - Extract main headings and sections from each rule file
   - Identify common themes and group related content
   - Determine logical flow based on content relationships
   - Preserve the original structure and emphasis from each file

2. **Create adaptive sections**
   - Use rule file names/titles as primary section headers
   - Group related content under logical subsections
   - Maintain the original hierarchy and formatting
   - Ensure all unique content is preserved

3. **Handle content consolidation**
   - Identify and merge duplicate guidelines
   - Preserve all unique examples and code snippets
   - Maintain all enforcement rules and requirements
   - Keep original formatting and emphasis intact

4. **Generate dynamic table of contents**
   - Create TOC based on discovered content structure
   - Ensure all sections are properly linked
   - Maintain logical flow and organization

## File Existence Handling

### When CLAUDE.md does NOT exist:
- Create new CLAUDE.md file with consolidated content from .cursor/rules/
- No user interaction required
- Proceed with standard generation process

### When CLAUDE.md already exists:
- **Prompt user with options**:
  ```
  CLAUDE.md already exists. What would you like to do?
  
  1. Replace existing - Overwrite with new consolidated content from .cursor/rules/
  2. Merge existing and new - Combine existing content with new rules
  
  Please choose (1 or 2):
  ```
- **If user chooses "Replace existing"**:
  - Overwrite existing file with new consolidated content
  - Preserve all original formatting and structure
- **If user chooses "Merge existing and new"**:
  - Read existing CLAUDE.md content
  - Identify sections that don't overlap with .cursor/rules/
  - Merge new rules with existing content
  - Preserve unique existing content
  - Update table of contents to include all sections

## Failure Actions

If the update fails:

1. **Check file access**: Verify .cursor/rules/ directory exists and is readable
2. **Review rule files**: Ensure all .mdc files are properly formatted
3. **Validate content**: Check that rule content is complete and well-structured
4. **Fix formatting**: Ensure markdown formatting is correct
5. **Handle user input**: If user input is invalid, re-prompt with clear options
6. **Re-run update**: Execute the command again after fixing issues
7. **Verify output**: Confirm CLAUDE.md contains all consolidated content

## Success Criteria

- CLAUDE.md file is created if it doesn't exist
- User preference is respected when file already exists
- CLAUDE.md contains all rules from .cursor/rules/ directory (regardless of which rules exist)
- Content is well-organized and easy to navigate based on actual content
- All original formatting and emphasis is preserved
- Duplicate content is consolidated intelligently
- All enforcement rules and mandatory requirements are included
- Single source of truth principle is maintained
- Table of contents is accurate and complete
- Document works with any number of rule files (0 to N)
- New rules are automatically included when added
- Removed rules are automatically excluded when deleted
- Existing content is preserved when user chooses merge option
