# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a simple, config-driven AI file processor designed for automation (particularly GitHub Actions). It processes markdown files using OpenAI models and maintains incremental processing state.

## Running the Processor

```bash
python3 simple_ai_processor.py --config processor_config.json
```

**Prerequisites:**
- Set appropriate API key in `.env` file or as environment variable:
  - `OPENAI_API_KEY` for OpenAI models (gpt-4o, gpt-4, etc.)
  - `ANTHROPIC_API_KEY` for Claude models (claude-sonnet-4, etc.)
- Create a config file (see [processor_config.example.json](processor_config.example.json))

## Architecture

### Processing Flow
The system uses an incremental, stateful processing model:

1. **Config-driven execution**: All settings (folders, prompt, model, state) are in a single JSON config file
2. **Stateful processing**: The `last_processed_file` field in config tracks progress, enabling incremental runs
3. **Ordered processing**: Files are sorted by modification time (oldest first) to ensure chronological processing
4. **Automatic state updates**: Config is updated after each successful file, but NOT on errors (enabling retries)

### Key Behaviors
- Searches for `.md` files recursively in `input_folder`
- Skips all files up to and including `last_processed_file`
- Groups files into batches of `max_batch_size` (if configured, otherwise processes individually)
- **Batching behavior**: Concatenates multiple files together and sends as ONE combined request to the AI
  - Example: `max_batch_size: 3` means 3 files are combined and processed together in a single API call
- Processes batches sequentially, updating state after each successful batch
- Stops on first error without updating state (allows retry from failure point)
- Output filenames: single files use original name, batches use range format (e.g., `file1_to_file3.txt`)

### Provider Pattern Architecture
The system uses a factory pattern to support multiple AI providers:
- **Interface**: [providers/base.py](providers/base.py) - `AIProvider` abstract base class
- **Implementations**:
  - [providers/openai_provider.py](providers/openai_provider.py) - OpenAI API wrapper
  - [providers/claude_provider.py](providers/claude_provider.py) - Anthropic Claude API wrapper
- **Factory**: [providers/factory.py](providers/factory.py) - `create_provider()` selects implementation based on model name
  - Models starting with `gpt`, `o1`, or `o3` use OpenAI
  - Models starting with `claude` use Anthropic

### Private Functions
All helper functions in [simple_ai_processor.py](simple_ai_processor.py) are prefixed with underscore (`_`) following Python conventions:
- `_process_batch_with_ai()`: Concatenates multiple files and sends combined content to the AI provider
- `_generate_batch_filename()`: Creates appropriate output filename for single files or batches
- `_save_output()`: Writes AI response to output folder
- `_load_prompt()`: Loads and combines multiple prompts (from files or inline strings)
- `_load_single_prompt()`: Helper to load a single prompt from file or string
- `_load_config()` / `_save_config()`: JSON config file operations
- `_get_input_files()`: Finds and filters markdown files based on state

## Config File Structure

Required fields:
- `input_folder`: Path to folder with markdown files to process
- `output_folder`: Where to save AI-generated outputs
- `prompt` / `prompt_file` / `prompt_files`: Prompt instruction(s) - supports:
  - Single inline string
  - Single file path
  - Array of prompts/files to combine

Optional fields:
- `model`: AI model to use - supports OpenAI (gpt-4o, gpt-4, o1, o3) and Claude (claude-sonnet-4-20250514, etc.). Default: `gpt-4o`
- `max_batch_size`: Number of files to concatenate together and send in a single AI request. Set to `null` or `1` to process individually. Example: `3` will group 3 files into one combined request.
- `last_processed_file`: Auto-managed state field (set to `null` to reprocess all)
