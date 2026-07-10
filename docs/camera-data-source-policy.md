# Camera Data Source Policy

## Evidence priority

1. Manufacturer user manuals and help guides.
2. Manufacturer support pages and firmware notes.
3. Manufacturer technical white papers and LUT download pages.
4. Community tests and user feedback, stored only as non-official notes.

Every verified fact must reference at least one registered official source. A community source cannot upgrade a fact to `official-confirmed` and cannot decide LUT size, range, native ISO, fixed ETTR offsets, import support, or recording behavior.

## Unknown values

Unavailable values remain `unknown`. Numeric zero is never used as an unknown sentinel. Similar models, sensor format, brand conventions, and third-party LUT packages are not valid substitutes for model-specific evidence.

## Firmware scope

Capabilities that depend on firmware record a minimum, maximum, or exact version when the official source states one. If the source is current but does not state a minimum version, the scope remains unknown and the source version is retained separately.

## Vendor LUT assets

The repository stores download-page metadata, supported models, version, format, optional hashes, and license status. Vendor LUT binaries are not committed unless redistribution is explicitly allowed. Unknown licensing is recorded as `redistribution-unknown` and requires local user import.

## Conflicts

Conflicting facts remain separate, reference all involved sources, and create an open conflict record. No source silently overwrites another source.
