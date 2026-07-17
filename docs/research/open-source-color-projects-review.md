# Open-source Color Projects Review

Date: 2026-07-15

| Project | License | Activity observed | Decision | Reason |
| --- | --- | --- | --- | --- |
| AcademySoftwareFoundation/OpenColorIO | BSD-3-Clause | Active in July 2026 | Reference only | Strong production color-management architecture; no creative asset copied. |
| AcademySoftwareFoundation/OpenColorIO-Config-ACES | BSD-3-Clause | Active in 2026 | Reference only | Useful technical transform organization; creative library remains camera-independent. |
| colour-science/colour | BSD-3-Clause | Active in July 2026 | Reference only | Useful color-science and LUT concepts; adding a large runtime dependency is unnecessary. |
| AcademySoftwareFoundation/OpenImageIO | Apache-2.0 | Active in July 2026 | Reference only | Useful image-I/O architecture; browser product does not need this native dependency. |
| aces-aswf/aces-core | Apache-2.0 | Public core reference | Reference only | Technical ACES material is outside the creative style asset layer. |
| cedeber/hald-clut | GPL-3.0 | Public repository | Not integrated | Copyleft scope and asset provenance require separate review. |
| ryancara/Spektrafilm-LUT-Generator | GPL-3.0 | Public repository | Not integrated | No code copied; project-authored implementation remains license-isolated. |
| shenmintao/Raw-Alchemy | AGPL-3.0 | Public repository | Not integrated | Network copyleft obligations are incompatible with this phase. |
| changyun233/Lumix-V-log-LUTs | MIT | Public community repository | Not integrated | Community technical transforms cannot be labeled vendor-official without primary evidence. |

## Repository URLs

- https://github.com/AcademySoftwareFoundation/OpenColorIO
- https://github.com/AcademySoftwareFoundation/OpenColorIO-Config-ACES
- https://github.com/colour-science/colour
- https://github.com/AcademySoftwareFoundation/OpenImageIO
- https://github.com/aces-aswf/aces-core
- https://github.com/cedeber/hald-clut
- https://github.com/ryancara/Spektrafilm-LUT-Generator
- https://github.com/shenmintao/Raw-Alchemy
- https://github.com/changyun233/Lumix-V-log-LUTs

## Integration policy

Only assets with verified provenance and redistribution rights may enter the repository. GPL and AGPL projects may inform interface research, but their code is not copied. Vendor LUT downloads remain local when redistribution rights are unclear. Missing license metadata is treated as not redistributable.
