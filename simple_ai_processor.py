#!/usr/bin/env python3
"""
Simple AI File Processor

Processes markdown files with an AI model using config-based settings.
Tracks the last processed file and processes new entries from oldest to newest.

Usage:
    python simple_ai_processor.py --config config.json
"""

import os
import json
import argparse
from pathlib import Path
from dotenv import load_dotenv
from providers import create_provider

load_dotenv()


def _process_batch_with_ai(file_paths: list, prompt: str, provider) -> str:
    """Process a batch of files together with the AI model.

    Args:
        file_paths: List of file paths to process together
        prompt: The instruction/prompt for the AI
        provider: The AI provider to use

    Returns:
        The AI-generated response for the batch
    """
    # Read and concatenate all file contents
    combined_content = []

    for file_path in file_paths:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        combined_content.append(f"File: {file_path}\n\n{content}")

    # Join all files with clear separators
    separator = "\n\n" + "="*80 + "\n\n"
    batch_content = separator.join(combined_content)

    # Use the provider to process the combined content
    return provider.process(batch_content, prompt)


def _generate_batch_filename(file_paths: list) -> str:
    """Generate a filename for a batch of files.

    Args:
        file_paths: List of file paths in the batch

    Returns:
        A filename representing the batch (e.g., "2024-01-10_to_2024-01-12.txt")
    """
    if len(file_paths) == 1:
        return Path(file_paths[0]).stem + ".txt"

    # Use first and last filename stems
    first_stem = Path(file_paths[0]).stem
    last_stem = Path(file_paths[-1]).stem

    return f"{first_stem}_to_{last_stem}.txt"


def _save_output(output: str, output_dir: str, output_filename: str) -> str:
    """Save the AI output to the specified directory."""
    # Create output directory if it doesn't exist
    Path(output_dir).mkdir(parents=True, exist_ok=True)

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


def _get_input_files(input_folder: str, last_processed: str = None, max_batch_size: int = None) -> list:
    """Get all input files from the folder, sorted by modification time (oldest first).

    Returns files after (excluding) the last_processed file.
    Limited to max_batch_size files if specified.
    """
    # Find all markdown files recursively
    input_path = Path(input_folder)
    all_files = list(input_path.rglob("*.md"))

    # Sort by modification time (oldest first)
    all_files.sort(key=lambda f: f.stat().st_mtime)

    # Convert to string paths
    file_paths = [str(f) for f in all_files]

    # If there's a last processed file, only return files after it
    if last_processed and last_processed in file_paths:
        last_index = file_paths.index(last_processed)
        file_paths = file_paths[last_index + 1:]

    # Apply batch size limit if specified
    if max_batch_size and max_batch_size > 0:
        file_paths = file_paths[:max_batch_size]

    return file_paths

def main():
    parser = argparse.ArgumentParser(
        description="Process markdown files with AI using config file"
    )
    parser.add_argument(
        '--config',
        required=True,
        help='Path to JSON config file'
    )

    args = parser.parse_args()

    # Load configuration
    config = _load_config(args.config)

    input_folder = config.get('input_folder')
    output_folder = config.get('output_folder')
    prompt = config.get('prompt')
    model = config.get('model', 'gpt-4o')
    max_batch_size = config.get('max_batch_size')
    last_processed = config.get('last_processed_file')

    # Validate required config fields
    if not all([input_folder, output_folder, prompt]):
        print("Error: Config must contain 'input_folder', 'output_folder', and 'prompt'")
        return

    # Create AI provider based on model
    try:
        provider = create_provider(model)
    except ValueError as e:
        print(f"Error: {str(e)}")
        return

    # Get files to process
    files_to_process = _get_input_files(input_folder, last_processed)

    if not files_to_process:
        print("No new files to process.")
        return

    print(f"Found {len(files_to_process)} file(s) to process")

    # Process files in batches
    batch_size = max_batch_size if max_batch_size and max_batch_size > 0 else 1

    for i in range(0, len(files_to_process), batch_size):
        batch = files_to_process[i:i + batch_size]

        if len(batch) == 1:
            print(f"\nProcessing: {batch[0]}")
        else:
            print(f"\nProcessing batch of {len(batch)} files:")
            for file_path in batch:
                print(f"  - {file_path}")

        try:
            # Process batch with AI
            output = _process_batch_with_ai(batch, prompt, provider)

            # Generate output filename for the batch
            output_filename = _generate_batch_filename(batch)

            # Save output
            output_path = _save_output(output, output_folder, output_filename)

            print(f"✓ Saved output to: {output_path}")

            # Update last processed file in config (the last file in the batch)
            config['last_processed_file'] = batch[-1]
            _save_config(args.config, config)

        except Exception as e:
            batch_desc = batch[0] if len(batch) == 1 else f"batch starting with {batch[0]}"
            print(f"✗ Error processing {batch_desc}: {str(e)}")
            # Don't update config on error, so we can retry this batch next time
            break

    print(f"\nDone! Outputs saved in: {output_folder}")


if __name__ == "__main__":
    main()
