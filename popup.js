(() => {
  const STORAGE_KEY = "autoAudioEnabled";
  const toggle = document.getElementById("enabled");
  const status = document.getElementById("status");

  chrome.storage.local.get({ [STORAGE_KEY]: true }, (result) => {
    if (chrome.runtime.lastError) {
      status.textContent = `Unable to load setting: ${chrome.runtime.lastError.message}`;
      return;
    }

    toggle.checked = result[STORAGE_KEY] !== false;
    toggle.disabled = false;
  });

  toggle.addEventListener("change", () => {
    toggle.disabled = true;
    status.textContent = "Saving…";

    chrome.storage.local.set({ [STORAGE_KEY]: toggle.checked }, () => {
      if (chrome.runtime.lastError) {
        status.textContent = `Unable to save setting: ${chrome.runtime.lastError.message}`;
        toggle.checked = !toggle.checked;
      } else {
        status.textContent = toggle.checked ? "Audio mode enabled." : "Audio mode disabled.";
      }
      toggle.disabled = false;
    });
  });
})();
