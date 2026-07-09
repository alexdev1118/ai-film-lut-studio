"""DaVinci Resolve current-frame export skeleton.

This script is intentionally a non-production scaffold. It documents where a
future DaVinci scripting integration would export the current timeline frame.
It does not call the DaVinci scripting API yet.
"""

from __future__ import annotations

import argparse
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export the current DaVinci Resolve timeline frame to a still image path.")
    parser.add_argument("--output-dir", required=True, help="Directory where the future frame export should be written.")
    parser.add_argument("--file-name", default="davinci-current-frame.jpg", help="Output still frame file name.")
    return parser.parse_args()


def validate_output_path(output_dir: Path, file_name: str) -> Path:
    if file_name.strip() == "":
      raise ValueError("file-name must not be empty.")

    if any(part in file_name for part in ("\\", "/", ":", "*", "?", "\"", "<", ">", "|")):
      raise ValueError("file-name contains characters that are unsafe for a local file path.")

    output_dir.mkdir(parents=True, exist_ok=True)
    if not output_dir.is_dir():
      raise ValueError(f"output-dir is not a directory: {output_dir}")

    return output_dir / file_name


def export_current_frame(output_path: Path) -> None:
    # TODO: Resolve DaVinci scripting API entry point after testing on an installed DaVinci Resolve environment.
    # TODO: Get current project, current timeline, current timecode, and render or grab one still frame.
    # TODO: Save the frame to output_path and return structured metadata for the local bridge.
    raise NotImplementedError(f"DaVinci frame export is not implemented yet. Planned output path: {output_path}")


def main() -> int:
    try:
      args = parse_args()
      output_path = validate_output_path(Path(args.output_dir).expanduser().resolve(), args.file_name)
      export_current_frame(output_path)
      return 0
    except Exception as error:
      print(f"DaVinci frame export skeleton stopped: {error}")
      return 1


if __name__ == "__main__":
    raise SystemExit(main())
