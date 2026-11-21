# YouTube Music Audio-Only Mode

A lightweight Manifest V3 extension for Chrome and Microsoft Edge. It helps keep YouTube Music playback audio-focused on `https://music.youtube.com/*`.

## Features

- **Automatic Song mode:** Watches the player interface and switches from Video to Song mode when the option is available.
- **Video hiding:** Hides video elements where YouTube Music's page structure allows, without pausing playback.
- **Artwork controls:** Attempts to hide the large now-playing artwork while leaving the mini-player thumbnail visible.
- **Popup toggle:** Enable or disable audio-only mode from the browser toolbar. Your preference is saved locally and is enabled by default.
- **Local operation:** The extension makes no external network requests and does not include tracking.

## Limitations

YouTube Music can keep the large player area or a gray placeholder visible after its video or artwork is hidden. The site's layout is controlled by YouTube Music, and removing that area reliably could interfere with playback, so the extension does not guarantee that the entire panel will disappear.

## Install as an unpacked extension

1. Download or clone this repository.
2. Open `chrome://extensions/` in Chrome or `edge://extensions/` in Microsoft Edge.
3. Turn on **Developer mode**.
4. Select **Load unpacked** and choose the folder containing `manifest.json`.
5. Open or refresh [YouTube Music](https://music.youtube.com/).

After changing extension files, reload the extension on the extensions page and refresh the YouTube Music tab.

## Tech

- Manifest V3
- Vanilla JavaScript, `MutationObserver`, and `chrome.storage.local`
- CSS

## License

MIT
