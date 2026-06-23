# Font Customizer — SillyTavern Extension

A third-party SillyTavern extension that lets you customize fonts in the chat interface and across the entire UI.

## Features

- **System / Generic Fonts** — Use any font installed on your system (e.g. `Arial`, `monospace`, `serif`).
- **Saved System Fonts** — Save previously used system/generic font stacks and switch between them from a dropdown.
- **Browser Font Check** — See whether the selected system font appears to be available in the browser currently viewing SillyTavern.
- **Google Fonts** — Load any font from [Google Fonts](https://fonts.google.com/) by name.
- **Saved Fonts** — Save Google Fonts you like to a persistent list and quickly switch between them via a dropdown.
- **Font Size** — Adjust font size (10–36 px).
- **Line Height** — Control line spacing (1.0–3.0).
- **Letter Spacing** — Fine-tune letter spacing (-2–5 px).
- **Scope** — Apply changes to chat messages only or the entire UI, including input fields such as the message compose area.
- **Live Preview** — See a preview of your settings before committing.
- **Reset** — One-click reset to defaults.

## Installation

1. Open SillyTavern and navigate to **Extensions → Install Extension**.
2. Paste the URL of this repository and click **Install**.
3. The extension will appear in the right-side settings panel under **Font Customizer**.

## Usage

1. Open the **Font Customizer** drawer in the extensions settings panel.
2. Check **Enable Font Customizer**.
3. Choose a font source:
   - **System / Generic** — Type a font family name (e.g. `Georgia`, `sans-serif`).
   - **Google Fonts** — Enter the exact font name from Google Fonts (e.g. `Roboto`, `Noto Sans SC`).
   System / Generic fonts can be saved to a local history dropdown. The availability check reports only the current browser/device, so a font detected on Windows may still be missing from Safari on iOS unless that device has an equivalent font available. Browser font checks can be inconclusive; the preview is the final confirmation.
4. Adjust size, line height, and letter spacing with the sliders.
5. Select whether to apply changes to **Chat Messages Only** or the **Entire UI**. Entire UI also targets common form controls and SillyTavern's message compose textarea.

Settings are saved automatically.

## Files

| File | Description |
|------|-------------|
| `manifest.json` | Extension metadata and load configuration |
| `index.js` | Core logic — settings management, style injection, event handling |
| `settings.html` | Settings panel UI |
| `style.css` | Styles for the settings panel |

## License

This project is licensed under the [GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.en.html) (AGPL-3.0), the same license as SillyTavern.
