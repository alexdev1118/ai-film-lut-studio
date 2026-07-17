import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { lutStrengthValidationFixtures } from "../src/data/lutStrengthFixtures";
import type { ColorPreviewAdjustments } from "../src/types";
import { createLutStrengthValidationMatrix } from "../src/utils/lutStrengthValidation";

const baseAdjustments: ColorPreviewAdjustments = {
  intensity: 100,
  contrast: 28,
  saturation: 32,
  temperature: 4,
  tint: -2,
  shadowMatch: 57,
  midtoneMatch: 62,
  highlightMatch: 56,
  skinToneProtection: true,
  preserveLuma: true,
  preventOversaturation: true
};

const formatNumber = (value: number): string => value.toFixed(6);

const run = (): void => {
  const projectDirectory = process.cwd();
  const reportsDirectory = join(projectDirectory, "docs", "reports");
  const matrix = createLutStrengthValidationMatrix(lutStrengthValidationFixtures, baseAdjustments);
  const markdownLines: string[] = [
    "# S16.5 Six-Scene Strength Matrix",
    "",
    "> This report uses deterministic procedural RGB stress fixtures. It does not claim that the user's six real media files were loaded or measured.",
    "",
    "| Scene | Strength | Average RGB distance | Maximum RGB distance | Pre-compression OOG | Post-compression OOG | Boundary channels | Neutral error | Hue drift P95 | Skin hue error | Max chroma reduction |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"
  ];

  for (const scene of matrix.scenes) {
    for (const result of scene.results) {
      const diagnostics = result.diagnostics;
      markdownLines.push([
        `| ${scene.label}`,
        `${result.strength}%`,
        formatNumber(result.averageRgbDistance),
        formatNumber(result.maximumRgbDistance),
        formatNumber(diagnostics.preCompressionOutOfGamutRatio),
        formatNumber(diagnostics.postCompressionOutOfGamutRatio),
        formatNumber(diagnostics.clippedChannelRatio),
        formatNumber(diagnostics.neutralAxisError),
        formatNumber(diagnostics.hueDriftP95),
        formatNumber(diagnostics.skinHueError),
        `${formatNumber(diagnostics.maximumChromaReduction)} |`
      ].join(" | "));
    }
  }

  markdownLines.push(
    "",
    `All scene strength sequences monotonic: ${matrix.allScenesMonotonic ? "yes" : "no"}`,
    "",
    "Real-media status is recorded separately in docs/progress/S16.5-completion.json and is not overwritten by this procedural report generator."
  );

  mkdirSync(reportsDirectory, { recursive: true });
  writeFileSync(join(reportsDirectory, "S16.5-six-scene-matrix.json"), `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
  writeFileSync(join(reportsDirectory, "S16.5-six-scene-matrix.md"), `${markdownLines.join("\n")}\n`, "utf8");
};

try {
  run();
  console.log("S16.5 procedural strength report generated successfully.");
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown S16.5 report generation error.";
  console.error(message);
  process.exitCode = 1;
}
