# Phylo

A config-driven CLI tool to process markdown files with AI and save the outputs. Perfect for journal analysis, batch document processing, and GitHub Actions automation.

## Features

- **Config-based**: All settings in a single JSON file
- **Incremental processing**: Tracks last processed file, only processes new entries
- **Ordered processing**: Processes files from oldest to newest (by modification time)
- **Batch processing**: Combine multiple files into single AI requests
- **Multi-provider support**: Works with OpenAI, Anthropic, and other providers via abso-ai
- **Iterative prompting**: Reload prompts after each batch when output matches prompt folder
- **GitHub Actions ready**: No manual input required, can run fully automated

## Installation

```bash
# Install globally
npm install -g phylo

# Or run with npx
npx phylo --config config.json
```

## Setup

1. Set your API keys as environment variables or in a `.env` file:
   - For OpenAI models: `OPENAI_API_KEY`
   - For Claude models: `ANTHROPIC_API_KEY`

2. Create a config file (see format below)

## Config File Format

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

| Field | Required | Description |
|-------|----------|-------------|
| `input_folder` | Yes | Path to folder containing markdown files to process (searches recursively) |
| `output_folder` | Yes | Where to save AI-generated outputs |
| `prompt` / `prompt_file` / `prompt_files` | Yes | The instruction(s) to send to the AI (see below) |
| `model` | No | AI model to use (default: `gpt-4o`) |
| `max_batch_size` | No | Number of files to combine per request. `null` or `1` = individual processing |
| `last_processed_file` | Auto | Tracks progress. Set to `null` to reprocess all files |

### Prompt Options

- `"prompt"`: Inline prompt string
- `"prompt_file"`: Path to a file or folder containing prompts
- `"prompt_files"`: Array of prompts/files/folders to combine

When a folder is specified, all `.md` files in it are combined alphabetically.

## Usage

```bash
# Basic usage
phylo --config processor_config.json

# With shorthand
phylo -c config.json
```

### How It Works

1. Reads the config file
2. Finds all `.md` files in `input_folder` (recursively)
3. Sorts files by modification time (oldest first)
4. Skips files up to and including `last_processed_file`
5. Groups remaining files into batches of `max_batch_size`
6. For each batch:
   - Concatenates files with separators
   - Sends to the AI model
   - Saves output to `output_folder`
   - Updates `last_processed_file` in config
7. Stops on error without updating config (allows retry)

### Output Filenames

- **Single file**: Uses same name as input (e.g., `2024-01-15.md`)
- **Batch**: Uses range format (e.g., `2024-01-10_to_2024-01-15.md`)

## GitHub Actions Integration

```yaml
- name: Process new markdown files
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    npx phylo --config processor_config.json
```

## Example Configs

### Individual Processing

```json
{
  "input_folder": "journals/2024",
  "output_folder": "analysis/2024",
  "prompt_file": "prompts/analyze.md",
  "model": "claude-sonnet-4-5-20250929"
}
```

### Batch Processing (3 files at a time)

```json
{
  "input_folder": "journals",
  "output_folder": "summaries",
  "prompt": "Create a weekly summary of these journal entries.",
  "model": "gpt-4o",
  "max_batch_size": 3
}
```

### Multiple Prompts Combined

```json
{
  "input_folder": "documents",
  "output_folder": "processed",
  "prompt_files": [
    "prompts/base_instructions.md",
    "prompts/output_format.md",
    "prompts/context"
  ],
  "model": "gpt-4o"
}
```

## Iterative Prompting

When `output_folder` matches one of the prompt paths, Phylo enables iterative prompting mode. After each batch, prompts are reloaded to include previous outputs, allowing the AI to build on its prior analysis.

## License

MIT

