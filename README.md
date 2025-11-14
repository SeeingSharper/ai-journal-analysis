# Simple AI Processor

A config-driven script to process markdown files with AI and save the outputs. Perfect for GitHub Actions automation.

## Features

- **Config-based**: All settings in a single JSON file
- **Incremental processing**: Tracks last processed file, only processes new entries
- **Ordered processing**: Processes files from oldest to newest (by modification time)
- **GitHub Actions ready**: No manual input required, can run fully automated
- **Auto-updating**: Config file is updated after each successful processing

## Setup

1. Ensure you have the appropriate API key in your `.env` file or environment variables:
   - For OpenAI models (gpt-4o, gpt-4, etc.): `OPENAI_API_KEY`
   - For Claude models (claude-sonnet-4, etc.): `ANTHROPIC_API_KEY`
2. Create a config file (see example below)

## Config File Format

Create a JSON config file with the following fields:

```json
{
  "input_folder": "journals",
  "output_folder": "ai_outputs",
  "prompt": "Summarize the main themes and insights from this journal entry.",
  "model": "gpt-4o",
  "max_batch_size": null,
  "last_processed_file": null
}
```

### Config Fields

- **input_folder** (required): Path to folder containing markdown files to process (searches recursively)
- **output_folder** (required): Where to save AI-generated outputs
- **prompt** / **prompt_file** / **prompt_files** (required): The instruction(s) to send to the AI. Can be:
  - `"prompt"`: A single inline prompt string
  - `"prompt_file"`: A single file path containing the prompt
  - `"prompt_files"`: An array of prompts/files to combine (e.g., `["prompts/base.txt", "prompts/format.txt"]`)
- **model** (optional): AI model to use. Supports OpenAI models (gpt-4o, gpt-4, etc.) and Claude models (claude-sonnet-4-20250514, etc.). Default: `gpt-4o`
- **max_batch_size** (optional): Number of files to concatenate and send together in a single AI request. Set to `null` or `1` to process files individually. Useful for analyzing multiple entries together or controlling API costs. For example, setting this to `3` will concatenate 3 files together and send them as one combined request to the AI.
- **last_processed_file** (auto-managed): Path to the last successfully processed file. Set to `null` to process all files.

## Usage

### Basic Example
```bash
python3 simple_ai_processor.py --config processor_config.json
```

### How It Works

1. Script reads the config file
2. Finds all `.md` files in `input_folder` (recursively)
3. Sorts files by modification time (oldest first)
4. Skips files up to and including `last_processed_file`
5. Groups remaining files into batches of size `max_batch_size` (or processes individually if not set)
6. For each batch:
   - Concatenates all files in the batch together with separators
   - Sends the combined content to the AI model in a single request
   - Saves output to `output_folder` (filename based on batch, e.g., `2024-01-10_to_2024-01-12.txt`)
   - Updates `last_processed_file` to the last file in the batch
7. If an error occurs, processing stops and config is not updated (allows retry)

### Output Files

Output filenames depend on batch size:
- **Single file** (batch_size = 1 or null): Uses same name as input
  - Input: `journals/2024-01-15.md`
  - Output: `ai_outputs/2024-01-15.txt`
- **Multiple files** (batch_size > 1): Uses range format
  - Input: `journals/2024-01-10.md`, `journals/2024-01-12.md`, `journals/2024-01-15.md`
  - Output: `ai_outputs/2024-01-10_to_2024-01-15.txt`

## GitHub Actions Integration

This script is designed to work in GitHub Actions:

```yaml
- name: Process new markdown files
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    python3 simple_ai_processor.py --config processor_config.json
```

Note: Only include the API key(s) that match the model you're using in your config.

The config file can be committed to the repo, and `last_processed_file` will be updated automatically as part of the workflow.

## Example Workflows

### Example 1: Individual Processing (batch_size = null or 1)

**First run** (config has `"last_processed_file": null`):
```
Found 3 file(s) to process
Processing: journals/2024-01-10.md
✓ Saved output to: ai_outputs/2024-01-10.txt
Processing: journals/2024-01-15.md
✓ Saved output to: ai_outputs/2024-01-15.txt
Processing: journals/2024-01-20.md
✓ Saved output to: ai_outputs/2024-01-20.txt
```

### Example 2: Batch Processing (batch_size = 3)

**First run** (config has `"last_processed_file": null and "max_batch_size": 3`):
```
Found 5 file(s) to process

Processing batch of 3 files:
  - journals/2024-01-10.md
  - journals/2024-01-15.md
  - journals/2024-01-20.md
✓ Saved output to: ai_outputs/2024-01-10_to_2024-01-20.txt

Processing batch of 2 files:
  - journals/2024-01-25.md
  - journals/2024-01-30.md
✓ Saved output to: ai_outputs/2024-01-25_to_2024-01-30.txt
```

**Second run** (no new files):
```
No new files to process.
```
