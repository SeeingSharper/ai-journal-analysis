# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a simple, config-driven AI journal processor designed for automation (particularly GitHub Actions). It processes markdown journal files using OpenAI models and maintains incremental processing state.

## Running the Processor

```bash
python3 simple_ai_processor.py --config processor_config.json
```

**Prerequisites:**
- Set `OPENAI_API_KEY` in `.env` file or as environment variable
- Create a config file (see [processor_config.example.json](processor_config.example.json))

## Architecture

### Processing Flow
The system uses an incremental, stateful processing model:

1. **Config-driven execution**: All settings (folders, prompt, model, state) are in a single JSON config file
2. **Stateful processing**: The `last_processed_file` field in config tracks progress, enabling incremental runs
3. **Ordered processing**: Files are sorted by modification time (oldest first) to ensure chronological processing
4. **Automatic state updates**: Config is updated after each successful file, but NOT on errors (enabling retries)

### Key Behaviors
- Searches for `.md` files recursively in `journal_folder`
- Skips all files up to and including `last_processed_file`
- Processes remaining files sequentially, updating state after each success
- Stops on first error without updating state (allows retry from failure point)
- Output files mirror input filenames but use `.txt` extension

### Private Functions
All helper functions in [simple_ai_processor.py](simple_ai_processor.py) are prefixed with underscore (`_`) following Python conventions:
- `_process_file_with_ai()`: Sends file content + prompt to OpenAI
- `_save_output()`: Writes AI response to output folder
- `_load_config()` / `_save_config()`: JSON config file operations
- `_get_journal_files()`: Finds and filters markdown files based on state

## Config File Structure

Required fields:
- `journal_folder`: Path to folder with markdown journal files
- `output_folder`: Where to save AI-generated outputs
- `prompt`: AI instruction for processing each file

Optional fields:
- `model`: OpenAI model (default: `gpt-4o`)
- `last_processed_file`: Auto-managed state field (set to `null` to reprocess all)

## Known TODOs

- [simple_ai_processor.py:94](simple_ai_processor.py#L94) - Batch files in configurable amounts
