# DaVinci Round-Trip Calibration

## Purpose

The round-trip tool compares the website's final Cube preview with an actual still rendered by DaVinci Resolve. It is intended to separate LUT numerical differences from input Profile, Gamma, Range, and display-management differences.

The comparator does not accept a Viewer screenshot as precision evidence. A screenshot can contain operating-system display transforms, Viewer color management, scaling, overlays, and compression that are outside the LUT pipeline.

## Website Contract

- POST LUT input: `bt709-g24-full`
- POST LUT output: `bt709-g24-full`
- Transfer function: BT.1886 Gamma 2.4
- Signal range: Full
- Browser preview transform: `bt709-g24-to-browser-srgb`
- Recommended DaVinci node Key Output: `1.000`

The source still Profile is an interpretation used to normalize the uploaded image before preview. It does not change the universal POST Cube's numerical input/output contract.

## DaVinci Node Order

1. Configure DaVinci YRGB, RCM, or a CST according to the source material.
2. Convert camera Log footage to Rec.709 Gamma 2.4 before the creative LUT.
3. Correct exposure and white balance.
4. Apply the exported POST LUT on a separate node.
5. Keep the LUT node Key Output at `1.000` for comparison.
6. Export an actual timeline still as PNG, supported 16-bit TIFF, or uncompressed RGB DPX.
7. Upload that exported still to the website's DaVinci Round-Trip panel.

For the bundled calibration PNG, use DaVinci YRGB with the chart interpreted as sRGB Full. If the chart is deliberately converted through another input pipeline, record that conversion and choose the matching render Profile in the panel.

## Comparison Metrics

- RGB mean absolute error
- Linear-light mean absolute error
- P95 channel error
- Maximum channel error
- Neutral-gray error
- Luminance error
- Saturation error
- Dark-region error
- Midtone-region error
- Highlight-region error

The current automatic diagnosis distinguishes an in-tolerance result, suspected Full/Legal mismatch, suspected Gamma mismatch, suspected input Profile mismatch, possible Viewer-only difference, and an unknown display-pipeline difference.

## Precision Limits

- Browser Canvas comparison is currently quantized to 8-bit RGBA.
- A browser may apply embedded ICC or PNG color metadata before Canvas readback.
- Browser TIFF decoding support varies. If TIFF cannot be decoded, use uncompressed RGB DPX or PNG.
- The DPX importer supports the documented S16.1.1 subset and reports unsupported descriptors or packing explicitly.
- An actual DaVinci render is required before a real round-trip can be marked as passed.
- The Cube hash is calculated after generation and stored in application state and export history. The Cube header uses `calculated-after-generation` because a file cannot contain its own final cryptographic hash without changing that hash.

## Failure Triage

1. If dark and highlight endpoints differ most, check Data Levels and Full/Legal interpretation.
2. If midtones differ most while endpoints remain close, check sRGB, Gamma 2.2, and Gamma 2.4 interpretation.
3. If saturation differs more than luminance, check primaries and source Profile.
4. If numerical render comparison passes but the Viewer looks different, inspect DaVinci Viewer, operating-system ICC, and monitor calibration.
5. If the actual render and expected output have different aspect ratios, export the same timeline frame without cropping or resizing.
