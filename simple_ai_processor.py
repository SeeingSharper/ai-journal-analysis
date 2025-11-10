#!/usr/bin/env python3
"""
Simple AI File Processor

Processes journal files with an AI model using config-based settings.
Tracks the last processed file and processes new entries from oldest to newest.

Usage:
    python simple_ai_processor.py --config config.json
"""

import os
import json
import argparse
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()


def _process_file_with_ai(file_path: str, prompt: str, client: OpenAI, model: str = "gpt-4o") -> str:
    """Process a single file with the AI model."""
    # Read file content
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Create the full prompt
    full_prompt = f"{prompt}\n\nFile: {file_path}\n\nContent:\n{content}"

    # Call AI model
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "user", "content": full_prompt}
        ]
    )

    return response.choices[0].message.content


def _save_output(output: str, output_dir: str, original_filename: str) -> str:
    """Save the AI output to the specified directory."""
    # Create output directory if it doesn't exist
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    # Generate output filename (keeping same name as input, just different extension)
    base_name = Path(original_filename).stem
    output_filename = f"{base_name}.txt"
    output_path = os.path.join(output_dir, output_filename)

    # Save the output
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(output)

    return output_path


def _load_config(config_path: str) -> dict:
    """Load configuration from JSON file."""
    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def _save_config(config_path: str, config: dict) -> None:
    """Save configuration back to JSON file."""
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2)


def _get_journal_files(journal_folder: str, last_processed: str = None) -> list:
    """Get all journal files from the folder, sorted by modification time (oldest first).

    Returns files after (excluding) the last_processed file.
    """
    # Find all markdown files recursively
    journal_path = Path(journal_folder)
    all_files = list(journal_path.rglob("*.md"))

    # Sort by modification time (oldest first)
    all_files.sort(key=lambda f: f.stat().st_mtime)

    # Convert to string paths
    file_paths = [str(f) for f in all_files]

    # If there's a last processed file, only return files after it
    if last_processed and last_processed in file_paths:
        last_index = file_paths.index(last_processed)
        return file_paths[last_index + 1:]

    return file_paths


# TODO: Batch files in configurable amounts

def main():
    parser = argparse.ArgumentParser(
        description="Process journal files with AI using config file"
    )
    parser.add_argument(
        '--config',
        required=True,
        help='Path to JSON config file'
    )

    args = parser.parse_args()

    # Load configuration
    config = _load_config(args.config)

    journal_folder = config.get('journal_folder')
    output_folder = config.get('output_folder')
    prompt = config.get('prompt')
    model = config.get('model', 'gpt-4o')
    last_processed = config.get('last_processed_file')

    # Validate required config fields
    if not all([journal_folder, output_folder, prompt]):
        print("Error: Config must contain 'journal_folder', 'output_folder', and 'prompt'")
        return

    # Initialize OpenAI client
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

    # Get files to process
    files_to_process = _get_journal_files(journal_folder, last_processed)

    if not files_to_process:
        print("No new files to process.")
        return

    print(f"Found {len(files_to_process)} file(s) to process")

    # Process each file
    for file_path in files_to_process:
        print(f"\nProcessing: {file_path}")

        try:
            # Process file with AI
            output = _process_file_with_ai(file_path, prompt, client, model)

            # Save output
            output_path = _save_output(output, output_folder, os.path.basename(file_path))

            print(f"✓ Saved output to: {output_path}")

            # Update last processed file in config
            config['last_processed_file'] = file_path
            _save_config(args.config, config)

        except Exception as e:
            print(f"✗ Error processing {file_path}: {str(e)}")
            # Don't update config on error, so we can retry this file next time
            break

    print(f"\nDone! Outputs saved in: {output_folder}")


if __name__ == "__main__":
    main()
