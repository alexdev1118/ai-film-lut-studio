# Camera Monitoring LUT Export Roadmap

AI Film LUT Studio now has two different LUT export directions:

1. **Post-production creative LUT**
   - Intended for DaVinci Resolve, Premiere Pro, Final Cut Pro, CapCut, and similar editing tools.
   - Assumes Rec.709 / standard display-space creative testing unless the user has already completed input conversion.
   - Does not replace camera Log technical conversion.

2. **Camera monitoring LUT**
   - Intended for cameras or monitoring workflows that can import a LUT for on-set viewing.
   - Must be separated by vendor, camera model, Log curve, gamut, LUT point count, range, and import behavior.
   - Must be verified in the target camera before production use.

## Why Camera LUTs Need Model-Specific Metadata

Camera monitoring LUT behavior depends on details that differ by manufacturer and model:

- Whether custom LUT import is supported.
- Whether the LUT is monitor-only or can be baked into recorded footage.
- Supported LUT file formats such as `.cube`, `.vlt`, `.aml`, `.look`, or vendor-specific variants.
- Supported 3D LUT point counts such as 17, 33, or 65.
- Full range versus legal range expectations.
- File naming restrictions and SD card folder paths.
- Supported Log curves and gamuts.
- Firmware behavior and monitoring pipeline order.

For this reason, a DaVinci creative LUT should not be casually copied into a camera and treated as production-safe.

## Why Not Directly Put Any DaVinci LUT Into A Camera

A post-production LUT may assume:

- A corrected Rec.709 input.
- A specific timeline color management setup.
- Tetrahedral or trilinear interpolation behavior in software.
- Floating-point processing before and after the LUT.
- Nodes before the LUT that normalize exposure and white balance.

A camera monitoring pipeline may not match those assumptions. The result can be wrong contrast, clipped highlights, shifted skin tones, unusable exposure monitoring, or a LUT file that the camera refuses to import.

## LUT Point Count, Range, File Name, And Import Risks

Before marking a camera profile as verified, collect and test:

- Supported LUT format.
- Supported 3D LUT size.
- Maximum file name length and allowed characters.
- Required card folder path.
- Whether the LUT can be applied only to monitoring or also burned into footage.
- Full range or legal range behavior.
- Whether the camera transforms Log before or after applying the LUT.
- Whether external monitors interpret the same LUT differently.

## Exposure Offset EV

The EV offset in this project is a monitoring brightness bias in the exported LUT:

- `0 EV`: no additional monitoring brightness bias.
- `+1 EV`, `+2 EV`, `+3 EV`: simple brightness lift with highlight rolloff in the generated LUT.

This does not change camera ISO, EI, shutter, aperture, ND, or actual exposure. It is not an ETTR recommendation. Official EI, Zebra, false color, middle gray, and highlight clipping guidance must be collected per model and Log curve.

## Why Sensor Format Matters

Full-frame, APS-C, Micro Four Thirds, Super 35, medium-format, 1-inch, and phone sensors can differ in:

- Native ISO / EI behavior.
- Noise floor and usable shadow lift.
- Highlight headroom.
- Manufacturer Log curve design.
- Monitoring pipeline and metadata behavior.

Do not reuse one exposure recommendation across all formats without official data and real footage tests.

## Official Data Needed

For each camera model, collect:

- Official LUT import documentation.
- Supported LUT file formats.
- Supported LUT point counts.
- Import folder path.
- File naming limits.
- Whether LUTs are monitoring-only.
- Whether LUTs can be baked into recording.
- Supported Log curves.
- Supported gamuts.
- Native ISO / EI data.
- Zebra / IRE recommendations.
- Middle gray guidance.
- Skin tone monitoring guidance.
- White clip / highlight clipping guidance.
- Firmware version notes.
- Links to official manuals or manufacturer support pages.

## Current V1 Status

The current implementation is a project structure and workflow foundation:

- Camera model catalog exists.
- Monitoring LUT export entry exists.
- `.cube` output is generated and validated.
- Camera metadata is written into the LUT header.
- Unknown or unverified models are clearly marked as needing official confirmation.

It is not a complete official camera LUT compatibility database and does not implement true camera Log technical conversion.
