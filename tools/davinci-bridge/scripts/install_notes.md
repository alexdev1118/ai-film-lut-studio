# DaVinci Script Install Notes

This folder does not contain an installable plugin. The script path must be confirmed on the target workstation and DaVinci Resolve version.

Common locations to verify later:

- Windows: user-specific DaVinci Resolve script folders under the Blackmagic Design application data directory.
- macOS: user-specific DaVinci Resolve script folders under Library/Application Support.
- Linux: user-specific DaVinci Resolve script folders under the user home configuration tree.

Before making this bridge real, confirm:

- DaVinci Resolve Studio or free edition scripting support for the required operation.
- Python version and module path used by the installed DaVinci Resolve build.
- Whether the scripting API can export or grab the current frame without manual UI actions.
- The correct LUT directory for the user's operating system.
- Whether DaVinci can refresh LUT lists programmatically or requires a manual refresh.
