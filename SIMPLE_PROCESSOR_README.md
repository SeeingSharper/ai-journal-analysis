# Simple AI Processor

A config-driven script to process journal files with AI and save the outputs. Perfect for GitHub Actions automation.

## Features

- **Config-based**: All settings in a single JSON file
- **Incremental processing**: Tracks last processed file, only processes new entries
- **Ordered processing**: Processes files from oldest to newest (by modification time)
- **GitHub Actions ready**: No manual input required, can run fully automated
- **Auto-updating**: Config file is updated after each successful processing

## Setup

1. Ensure you have `OPENAI_API_KEY` in your `.env` file or environment variables
2. Create a config file (see example below)

## Config File Format

Create a JSON config file with the following fields:

```json
{
  "journal_folder": "journals",
  "output_folder": "ai_outputs",
  "prompt": "Summarize the main themes and insights from this journal entry.",
  "model": "gpt-4o",
  "last_processed_file": null
}
```

### Config Fields

- **journal_folder** (required): Path to folder containing markdown journal files (searches recursively)
- **output_folder** (required): Where to save AI-generated outputs
- **prompt** (required): The instruction to send to the AI for each file
- **model** (optional): OpenAI model to use (default: `gpt-4o`)
- **last_processed_file** (auto-managed): Path to the last successfully processed file. Set to `null` to process all files.

## Usage

### Basic Example
```bash
python3 simple_ai_processor.py --config processor_config.json
```

### How It Works

1. Script reads the config file
2. Finds all `.md` files in `journal_folder` (recursively)
3. Sorts files by modification time (oldest first)
4. Skips files up to and including `last_processed_file`
5. Processes each remaining file with the AI model
6. Saves output to `output_folder` with same filename (`.txt` extension)
7. Updates `last_processed_file` in config after each successful processing
8. If an error occurs, processing stops and config is not updated (allows retry)

### Output Files

Output files use the same name as the input file:
- Input: `journals/2024-01-15.md`
- Output: `ai_outputs/2024-01-15.txt`

## GitHub Actions Integration

This script is designed to work in GitHub Actions:

```yaml
- name: Process new journal entries
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  run: |
    python3 simple_ai_processor.py --config processor_config.json
```

The config file can be committed to the repo, and `last_processed_file` will be updated automatically as part of the workflow.

## Example Workflow

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

**Second run** (after adding new journal):
```
Found 1 file(s) to process
Processing: journals/2024-01-25.md
✓ Saved output to: ai_outputs/2024-01-25.txt
```

**Third run** (no new journals):
```
No new files to process.
```
