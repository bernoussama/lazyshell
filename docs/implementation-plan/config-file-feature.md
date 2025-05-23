# Add Configuration File Feature

## Background and Motivation

The current CLAI-TS tool relies on environment variables to determine which AI provider to use. Users need to:
1. Manually set environment variables for API keys (GROQ_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, etc.)
2. The tool automatically selects the first available provider based on environment variables

This creates friction for users who want to:
- Switch between providers easily
- Store their preferred provider and API key persistently
- Have a more user-friendly setup process

The new configuration feature will:
- Check for a config file on startup
- Prompt users to select provider and enter API key if config doesn't exist
- Validate existing config and prompt for missing information
- Store configuration persistently for future use

## Key Challenges and Analysis

1. **Config File Location**: Need to decide where to store the config file (user home directory vs project directory)
2. **Security**: API keys are sensitive - need to handle storage securely
3. **Backwards Compatibility**: Should still support environment variables as fallback
4. **User Experience**: Make the provider selection and API key input user-friendly
5. **Validation**: Validate API keys and provider selections

## Branch Name

`feat/config-file-feature`

## High-level Task Breakdown

### Phase 1: Infrastructure Setup
- [ ] **Task 1.1**: Create feature branch `feat/config-file-feature`
  - Success criteria: Branch created and checked out
  
- [ ] **Task 1.2**: Create config module with interfaces and basic file operations
  - Create `src/lib/config.ts` with TypeScript interfaces
  - Implement config file read/write operations
  - Add config validation functions
  - Success criteria: Config module compiles without errors

### Phase 2: User Interface for Config Setup
- [ ] **Task 2.1**: Add provider selection prompt
  - Implement interactive provider selection using inquirer
  - List all supported providers with descriptions
  - Success criteria: User can select provider from list

- [ ] **Task 2.2**: Add API key input prompt
  - Implement secure API key input (hidden input)
  - Add API key validation
  - Success criteria: User can enter and validate API key

### Phase 3: Config Integration
- [ ] **Task 3.1**: Modify startup flow to check config
  - Update main CLI entry point to check config before proceeding
  - Implement config initialization flow
  - Success criteria: CLI checks config on startup

- [ ] **Task 3.2**: Update AI model selection to use config
  - Modify `getDefaultModel()` to prefer config over environment variables
  - Maintain backwards compatibility with environment variables
  - Success criteria: Model selection uses config when available

### Phase 4: Testing and Documentation
- [ ] **Task 4.1**: Add comprehensive tests
  - Unit tests for config module
  - Integration tests for config flow
  - Success criteria: All tests pass with >80% coverage

- [ ] **Task 4.2**: Update documentation
  - Update README with config information
  - Add troubleshooting section
  - Success criteria: Documentation is clear and complete

## Project Status Board

### In Progress
- [ ] Setting up project structure

### Todo
- [ ] All tasks from High-level Task Breakdown

### Completed
- [x] Created implementation plan
- [x] Created scratchpad
- [x] Analyzed current codebase

## Current Status / Progress Tracking

**Status**: Planning Phase
**Current Focus**: Setting up project infrastructure
**Blockers**: None
**Next Steps**: Create feature branch and start implementation

## Executor's Feedback or Assistance Requests

*Will be updated by executor during implementation*

## Lessons Learned

*Will be updated as development progresses* 