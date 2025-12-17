<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# TunaiCukai MY

**Credit**: Wan Mohd Azizi (Rikayu Wilzam)

</div>

## Overview
A smart tax and voucher system designed to simplify cash transaction filing and receipt management.

## Refactor Change Log (Reference)
- **[REF-001]**: Refactored Intro Sequence & Animation. Updated flow to "wipe" transition with sequenced text.
- **[REF-002]**: Refactored Navigation & Live Agent Integration. Optimized sidebar layout and overlay logic.
- **[REF-003]**: News & In-Depth Tax Logic Integration. Added 2025 Tax Reliefs info tab and LHDN eligibility checking service.
- **[REF-004]**: Template Designer (E-Invois) Redesign. Implemented split-view editor with real-time preview, LHDN compliant fields (TIN, MSIC), and visual validation (QR, UUID).
- **[REF-005]**: Localization & Branding. Set Bahasa Malaysia as default, added "E-Invois" localization, and integrated Stripe Climate Badge.

## Documentation
*   [Configuration Manual](config_manual.md)
*   [Wireframe Flowchart](wireframe_flow.md)

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
