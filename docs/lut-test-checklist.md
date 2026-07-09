# LUT Test Checklist

This checklist is for manually validating `.cube` files exported by AI Film LUT Studio.

## 1. Download The LUT

1. Open `/workspace`.
2. Adjust the creative parameters.
3. Choose LUT precision: 17, 33, or 65.
4. Click `导出 .cube`.
5. Confirm the browser downloads a `.cube` file.

## 2. Inspect The `.cube` Header

Open the file in a text editor and confirm it contains:

```cube
TITLE "..."
LUT_3D_SIZE 33
DOMAIN_MIN 0.0 0.0 0.0
DOMAIN_MAX 1.0 1.0 1.0
```

Expected RGB data line counts:

- `17`: 4,913 lines
- `33`: 35,937 lines
- `65`: 274,625 lines

Each data row should contain three numeric RGB values in the `0.0` to `1.0` range.

## 3. Import In DaVinci Resolve

1. Copy the `.cube` file into your Resolve LUT folder or use Resolve's LUT import workflow.
2. Refresh LUTs in Project Settings if needed.
3. Apply the LUT on a separate node.

Recommended node order:

1. Node 1: base exposure and white balance.
2. Node 2: CST or Log to Rec.709 transform if the source is Log.
3. Node 3: creative LUT exported from this tool.
4. Node 4: final saturation, skin tone, highlight, and contrast tweaks.

## 4. Test Rec.709 Footage

1. Use Rec.709 or already-normalized footage.
2. Apply the exported LUT.
3. Compare against the web preview direction.
4. Lower node key output if the look is too strong.

## 5. Test Log Footage Carefully

This exported LUT is a basic creative Rec.709/display-space LUT. It is not a Sony S-Log3, Canon C-Log, DJI D-Log, Panasonic V-Log, Fuji F-Log, Nikon N-Log, or BMD Film technical conversion LUT.

For Log footage:

1. Convert Log to Rec.709 first.
2. Balance exposure and white balance.
3. Apply this LUT after the technical transform.
4. Reduce LUT strength if colors clip or skin tones shift too far.

## 6. Browser Video Frame Capture Limits

The video frame capture tool depends on the browser's local decoding support. It is intended for quick frame extraction from common web-playable files, not for decoding every camera master format.

Recommended input for browser frame capture:

- MP4 container.
- H.264 codec.
- 8bit Rec.709 or already-normalized video.

Files that may fail to preview in the browser:

- MOV files containing H.265 / HEVC.
- ProRes.
- 10bit or 12bit camera files.
- Log or HDR high-spec camera originals.
- Proprietary camera recording formats.

If a video does not preview, treat it as a browser decoding limit rather than a failed upload. Recommended alternate flow:

1. Export the current frame as JPG, PNG, or TIFF from DaVinci Resolve, Premiere Pro, Final Cut Pro, CapCut Pro, or camera utility software.
2. Return to `/workspace`.
3. Use `选择图片` in the target media bin to upload the exported still frame.
4. Generate the creative LUT from that still frame.

## 7. Troubleshooting Preview Differences

If the web preview and editing software do not match exactly, check:

- Whether the source is Rec.709 or Log.
- Whether a CST or input transform is applied before the LUT.
- Whether timeline color management changes the displayed image.
- Whether the software uses tetrahedral or trilinear LUT interpolation.
- Whether exposure, white balance, or saturation were changed before applying the LUT.
- Whether the LUT is loaded as an Input LUT instead of a creative/look LUT.
