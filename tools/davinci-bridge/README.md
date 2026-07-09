# DaVinci Bridge Skeleton

This folder is a bridge prototype for future DaVinci Resolve workflows. It is not a production plugin and is not currently wired into the React app.

Current scope:

- Document possible local bridge API contracts.
- Keep a placeholder script location for DaVinci frame export experiments.
- Describe installation notes that must be confirmed per operating system and DaVinci Resolve version.

Not implemented:

- Real DaVinci plugin packaging.
- Automatic timeline frame export.
- Local HTTP service.
- Automatic `.cube` writing to DaVinci LUT folders.
- Automatic LUT list refresh inside DaVinci Resolve.

The current product workflow remains manual: export or capture a still frame, import it into the web workspace, generate a creative Rec.709/display-space LUT, then import the `.cube` file into the editing or grading software.
