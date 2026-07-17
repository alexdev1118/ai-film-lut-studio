import assert from "node:assert/strict";
import test from "node:test";
import { demoTargetImage } from "../src/data/demoProject";
import { productTerms } from "../src/data/productGuidance";
import type { LutParameters } from "../src/types";
import {
  applyExperienceModeToParameters,
  createDefaultQuickWorkflowPreferences,
  getTargetEditorGuide,
  migrateQuickWorkflowPreferences,
  resolvePostExportGuard,
  resolveQuickIntensity
} from "../src/utils/productWorkflow";

const parameters: LutParameters = {
  intensity: 50,
  contrast: 12,
  saturation: -4,
  temperature: 3,
  shadowMatch: 46,
  midtoneMatch: 54,
  highlightMatch: 58,
  tint: -2,
  inputColorSpace: "Rec.709",
  precision: "33x33x33"
};

test("quick and professional modes preserve the exact shared LUT parameters", () => {
  const quickParameters = applyExperienceModeToParameters("quick", parameters);
  const professionalParameters = applyExperienceModeToParameters("professional", parameters);

  assert.deepEqual(quickParameters, parameters);
  assert.deepEqual(professionalParameters, parameters);
  assert.deepEqual(quickParameters, professionalParameters);
});

test("unrestored Log footage blocks a reliable POST LUT export claim", () => {
  const guard = resolvePostExportGuard({
    footageAppearance: "log-flat",
    hasVerifiedTechnicalTransform: false,
    currentPixelsConfirmedRec709: false
  });

  assert.equal(guard.canExportPostLut, false);
  assert.equal(guard.level, "blocked");
  assert.match(guard.message, /先.*还原|技术还原/);
});

test("unknown footage state remains usable through an explicit caution path", () => {
  const guard = resolvePostExportGuard({
    footageAppearance: "unknown",
    hasVerifiedTechnicalTransform: false,
    currentPixelsConfirmedRec709: false
  });

  assert.equal(guard.canExportPostLut, true);
  assert.equal(guard.level, "caution");
  assert.match(guard.message, /未确认|不确定/);
});

test("target software guides use distinct actionable instructions", () => {
  const davinci = getTargetEditorGuide("davinci-resolve");
  const premiere = getTargetEditorGuide("premiere-pro");
  const finalCut = getTargetEditorGuide("final-cut-pro");

  assert.notDeepEqual(davinci.steps, premiere.steps);
  assert.notDeepEqual(premiere.steps, finalCut.steps);
  assert.match(davinci.steps.join(" "), /节点|CST/);
  assert.match(premiere.steps.join(" "), /Lumetri/);
  assert.match(finalCut.steps.join(" "), /Custom LUT/);
});

test("quick intensity labels map to the existing shared strength values", () => {
  assert.equal(resolveQuickIntensity("natural"), 35);
  assert.equal(resolveQuickIntensity("standard"), 50);
  assert.equal(resolveQuickIntensity("rich"), 70);
  assert.equal(resolveQuickIntensity("full"), 100);
});

test("legacy or invalid quick workflow state migrates without unsafe assumptions", () => {
  const defaults = createDefaultQuickWorkflowPreferences();
  const migrated = migrateQuickWorkflowPreferences({
    footageAppearance: "invalid",
    styleAcquisitionMode: "reference",
    intensityPreset: 70,
    targetEditor: "premiere-pro"
  });

  assert.equal(defaults.footageAppearance, "unknown");
  assert.equal(migrated.footageAppearance, "unknown");
  assert.equal(migrated.styleAcquisitionMode, "reference");
  assert.equal(migrated.intensityPreset, "rich");
  assert.equal(migrated.targetEditor, "premiere-pro");
});

test("the bundled demo target is deterministic and available without a network request", () => {
  assert.equal(demoTargetImage.width, 1600);
  assert.equal(demoTargetImage.height, 900);
  assert.match(demoTargetImage.url, /^data:image\/svg\+xml/);
  assert.equal(demoTargetImage.inputState, "rec709");
});

test("every exposed technical term declares its owner and beginner visibility", () => {
  assert.ok(productTerms.length >= 10);
  productTerms.forEach((term) => {
    assert.ok(term.chineseName.length > 0);
    assert.ok(term.oneLineExplanation.length > 0);
    assert.ok(["website", "davinci", "camera", "professional-diagnostics"].includes(term.owner));
    assert.equal(typeof term.showInQuickMode, "boolean");
  });
});
