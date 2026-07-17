# LUT Style Library Research

Date: 2026-07-15

## Scope

This review establishes a legally traceable baseline for the first formal style library. It does not import third-party LUT files, vendor binaries, paid assets, film scans, or copyrighted frame captures. The first release uses project-authored structured parameters and the shared RGB core.

## High-value directions

The initial library prioritizes twelve distinct directions rather than a large set of renamed duplicates:

- Print-film inspired tonal separation with restrained saturation.
- Soft print and faded negative interpretations.
- Warm narrative and cool neo-noir looks.
- Natural skin and clean commercial rendering.
- Documentary, food, and travel looks with conservative gamut behavior.
- Bleach-bypass inspired and neon-night stylization.

Each style is defined as either `original-authored` or `inspired-by-public-characteristics`. Names such as `Print 2383 Inspired` are explicitly an original digital interpretation and are not presented as an official Kodak asset.

## Technical references

- OpenColorIO provides production color-management architecture and configuration conventions. Its repository is BSD-3-Clause licensed.
- OpenColorIO-Config-ACES provides a traceable ACES configuration and transform organization under BSD-3-Clause. Its technical transforms are not copied into the creative style library.
- Colour provides color-science and LUT data-structure references under BSD-3-Clause. No runtime dependency or source code was copied.
- OpenImageIO provides image-I/O architecture under Apache-2.0. It was reviewed as an interoperability reference only.
- ACES Core provides public reference transforms under Apache-2.0. It is a technical color-management source, not a creative LUT source.

## Asset decision

No external creative LUT was accepted for redistribution in this phase. Public repositories with GPL-3.0, AGPL-3.0, missing license metadata, unclear asset provenance, or community-authored camera transforms were excluded from integration. The application embeds only locally generated previews and project-authored style parameters.

## Validation boundary

All twelve styles pass deterministic six-scene stress fixtures at 35, 50, 70, and 100 percent strength. The shared RGB core has real DaVinci round-trip evidence. Individual style-specific real-media DaVinci review remains pending and is not represented as completed.
