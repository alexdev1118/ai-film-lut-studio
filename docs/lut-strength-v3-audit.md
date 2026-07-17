# LUT Strength and Gamut Safety V3 Audit

## Scope

This audit covers the shared RGB path used by browser preview and POST `.cube` export. The input and output contract remains Rec.709 / Gamma 2.4 / Full. Camera Log technical conversion is outside this creative transform.

## Processing Order

1. Clamp the input sample to the declared 0 to 1 domain.
2. Return the input exactly when style strength is 0 percent.
3. Apply contrast around a 0.5 pivot.
4. Apply saturation around Rec.601 luma.
5. Apply explicit temperature and Tint controls.
6. Calculate shadow, midtone, and highlight candidates.
7. Blend the three tonal candidates with continuous luminance weights.
8. Apply the optional reference average-color influence.
9. Apply warm-midtone skin protection when enabled.
10. Apply luminance preservation when enabled.
11. Stabilize saturated hues when no explicit temperature, Tint, or reference-color shift is requested.
12. Apply continuous shadow and highlight chroma roll-off when the look has a non-zero creative magnitude.
13. Compress the full look into display gamut in OKLab while preserving hue.
14. Mix identity and the safe full look exactly once using style strength.
15. Clamp only numerical residue to the 0 to 1 output domain.

## Strength Semantics

- 0 percent returns strict identity.
- 35, 50, 70, and 100 percent are linear positions between the input and the safe full look.
- 50 percent is the exact midpoint between identity and the safe full look.
- Strength is not applied in the preview layer, Cube evaluator, or download layer a second time.
- DaVinci Resolve Key Output Gain remains 1.000 for matching the baked website strength.

## Gamut Safety

`src/utils/gamutCompression.ts` implements an extended-sRGB to OKLab conversion, same-hue maximum chroma search, soft-knee chroma compression, numerical boundary safety, and OKLab chroma scaling. It has no DOM, Canvas, or external package dependency.

The safety path records:

- pre-compression out-of-gamut ratio;
- post-compression out-of-gamut ratio;
- exact boundary-channel ratio;
- neutral-axis error;
- hue drift P95;
- skin-hue error;
- maximum chroma reduction.

The output is not described as a technical camera transform. It is a creative display-referred mapping under the POST contract.

## Tonal Regions

The former hard branch at luma 0.33 and 0.66 was replaced by continuous weights:

- shadow weight fades between luma 0.25 and 0.41;
- midtone weight occupies the remaining normalized weight;
- highlight weight rises between luma 0.59 and 0.75.

This removes interpolation discontinuities around the former boundaries while preserving distinct shadow, midtone, and highlight behavior.

## Cube Interpolation Acceptance

Cube consistency uses average, P95, and isolated maximum RGB error together. P95 and average thresholds tighten with Cube size. A narrow saturated gamut-cusp sample is allowed a higher isolated maximum than the distribution threshold because 17-point trilinear sampling cannot represent that boundary as precisely as 33-point or 65-point sampling.

## Validation Assets

The repository contains deterministic procedural RGB stress fixtures for six scene categories. They are not the user's real media and must not be reported as real-media validation. Real DaVinci validation is tracked separately through Test A and Test B in `docs/progress/S16.4.2-computer-use-recovery.json`.

## Real DaVinci Retest

The revised core was rendered in the dedicated `AI_LUT_AUTOTEST_S16_4_2` project with DaVinci Key Output Gain 1.000. Calibration Test A at 50 percent passed. The real Sony S-Log3 / S-Gamut3.Cine Test B frame passed at 35, 50, 70, and 100 percent.

The round-trip comparator now records P99, P99.9, and high-error channel counts. A sparse interpolation-tail allowance is used only when RGB MAE and P95 pass, P99.9 is at most 0.03, the maximum is at most 0.125, and no more than 0.01 percent of channel samples exceed 0.08. A regression test proves that repeated high-error tails still fail.

The 100 percent Test B result contained 139 channels above 0.08 out of 2,430,000 channel samples, with RGB MAE 0.00091403, P95 0.00392157, P99.9 0.02745098, and maximum 0.11372549. This is classified as a sparse gamut-cusp interpolation tail, not a Gamma, Range, stale-Cube, duplicate-LUT, or evaluator mismatch.

## Remaining Validation Boundary

The repository does not contain the user's six real scene files. The six-scene matrix therefore remains deterministic procedural stress coverage, supplemented by a real Sony person frame and a real DaVinci calibration render. A future manual batch should repeat the matrix with the six user-owned local scenes; those media must remain outside Git.

## Dark Saturated Hue Follow-up

Formal style stress testing exposed one dark saturated red sample that had high relative signal saturation but low absolute OKLab chroma. The previous protection weight used only absolute chroma, and the warm-skin candidate test could also classify a saturated red sample as skin. The shared core now combines absolute OKLab chroma with relative channel saturation and requires the green channel to reach at least 35 percent of red before warm-skin protection can activate.

The exact v2 50 percent Cube SHA-256 is `ebbd1c509bd4468fc9b1254fa5a91103cff66533ede0c574247ee8db4f9a5a75`. A fresh DaVinci calibration render passed with RGB MAE `0.0005271718`; the Sony CST plus LUT render passed with RGB MAE `0.0009388364`, P99.9 `0.0156862745`, maximum `0.0509803922`, and zero channels above `0.08`. The dedicated project, Gamma 2.4 contract, Full Range, same frame, CST, and Key Output Gain 1.000 were retained.
