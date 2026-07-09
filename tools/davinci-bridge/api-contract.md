# Local Bridge API Contract Draft

This contract is a draft for a future local-only bridge service. No server is implemented in the current project.

## POST /api/import-frame

Purpose: import a still frame into the web workspace.

Request:

```json
{
  "fileName": "timeline-frame-001.jpg",
  "mimeType": "image/jpeg",
  "width": 1920,
  "height": 1080,
  "source": "davinci-current-timeline"
}
```

Response:

```json
{
  "ok": true,
  "mediaId": "target-frame-id"
}
```

## POST /api/export-lut

Purpose: ask the local bridge to save a generated `.cube` file to a user-approved path.

Request:

```json
{
  "fileName": "AI_Film_LUT_Studio.cube",
  "lutSize": 33,
  "lutType": "basic-creative-rec709",
  "targetPath": "USER_CONFIRMED_LUT_DIRECTORY"
}
```

Response:

```json
{
  "ok": true,
  "savedPath": "USER_CONFIRMED_LUT_DIRECTORY/AI_Film_LUT_Studio.cube"
}
```

## GET /api/workspace-state

Purpose: expose the current workspace state to a local helper.

Response:

```json
{
  "lutName": "Custom_Studio_V1",
  "lutSize": 33,
  "selectedStyleName": "Custom Reference",
  "inputType": "rec709",
  "parameters": {
    "intensity": 72,
    "contrast": 18,
    "saturation": 12,
    "temperature": 4,
    "tint": 0,
    "shadowMatch": 62,
    "midtoneMatch": 70,
    "highlightMatch": 58
  }
}
```

## POST /api/apply-preset

Purpose: apply a saved workspace preset from a future local library.

Request:

```json
{
  "presetId": "preset-id",
  "mode": "replace-parameters"
}
```

Response:

```json
{
  "ok": true
}
```

## Error Shape

All future bridge endpoints should return the same error shape:

```json
{
  "ok": false,
  "errorCode": "INVALID_PAYLOAD",
  "message": "Readable error message"
}
```
