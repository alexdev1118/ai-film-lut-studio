# Camera Data Verification Workflow

## Scope

This workflow governs camera-specific metadata used by AI Film LUT Studio. It does not establish a camera color transform, Log conversion, exposure rule or compatibility guarantee by itself. A data entry remains experimental until its evidence is recorded and reviewed.

## Source Priority

Use sources in this order when recording a camera capability:

1. Official camera manual for the exact model and firmware generation.
2. Official support page maintained by the manufacturer.
3. Official LUT download, import guide or technical white paper.
4. Official firmware release note that changes LUT, monitoring or recording behavior.
5. Community test or user feedback, kept separate from official evidence.
6. Internal assumption, used only to register a missing evidence request.

An internal assumption is never an official source and cannot verify a technical fact.

## Recording Official Documents

Record one `CameraDataSource` per document or authoritative page. Include the exact model, title, source type, document version, firmware version, language, page number or section when available. Record the URL only after it has been reviewed by a user and GPT in a future verification task.

Create one `CameraVerifiedFact` for each independently checkable claim. A LUT import path, supported format, maximum point count, slot count, range behavior, recording behavior, gamma, gamut or exposure item must not be bundled into one broad claim. Each fact must list every supporting source ID.

## Firmware Handling

Camera behavior can change by firmware. Keep the applicable firmware versions in `appliesToFirmware` for each fact and `firmwareScope` for an associated directory profile. When a document does not state firmware coverage, leave the firmware version unset and keep the fact below `official-confirmed`.

Never assume that a fact verified for one firmware applies to later firmware. Record a new source or revise the fact after a firmware change is reviewed.

## Official Data And Community Feedback

Official documents and community observations must remain separate:

- `official-confirmed` requires supporting official sources and a completed review.
- `official-incomplete` means official material exists but does not prove the full field scope.
- `community-consensus` can inform a test plan but cannot upgrade an official status.
- `experimental` is for repeatable internal tests that still lack authoritative confirmation.
- `unknown` is the required state when no conclusion has been validated.

## Conflicting Information

When sources disagree, keep all source records and set the affected source or fact to `conflicting`. Do not overwrite an older value silently. The status panel must show the conflict until a scoped decision is recorded with its supporting sources and firmware range.

## Fact-To-Source Links

Every technical fact must use non-empty `sourceIds`. The review should verify that the linked source actually covers the claimed model, capability and firmware. A fact with unrelated, unverified or missing source IDs remains unverified.

## Conditions For verified-official

A camera directory profile can become `verified-official` only when all of the following are true:

1. It has at least one recorded official source ID.
2. Each claimed capability is represented by a traceable `CameraVerifiedFact`.
3. Facts list their applicable model and firmware scope.
4. No unresolved source or fact is marked `conflicting` for the same capability.
5. The user and GPT have reviewed the evidence in a dedicated verification task.

Until all five conditions are satisfied, retain `needs-official-confirmation` and present the export as experimental.

## Exposure Boundaries

Sensor size alone cannot produce an ETTR, ISO, Cine EI, Zebra, middle-gray or white-clip recommendation. Those values depend on the exact camera model, recording mode, gamma, gamut, firmware and monitoring workflow. Do not infer them from full-frame, APS-C, Super 35 or Micro Four Thirds labels.

LUT point count, Range and baked recording behavior also require model-specific confirmation. A generic `.cube` export, a prior project setting or a community test does not establish camera import compatibility.

## Pilot Models

The first evidence registries are intentionally empty and unverified for:

- Sony A6700
- Sony FX3
- Panasonic S5 IIX

Each registry has four pending evidence requests: official manual, firmware-specific verification, LUT import specification and exposure guidance verification. These entries are project reminders, not camera specifications.
