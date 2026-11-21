(() => {
  const STORAGE_KEY = "autoAudioEnabled";
  const toggle = document.getElementById("enabled");
  const status = document.getElementById("status");
  const statusText = document.getElementById("status-text");

  function setStatus(state, message) {
    status.dataset.state = state;
    statusText.textContent = message;
  }

  chrome.storage.local.get({ [STORAGE_KEY]: true }, (result) => {
    if (chrome.runtime.lastError) {
      setStatus("error", `Unable to load setting: ${chrome.runtime.lastError.message}`);
      return;
    }

    toggle.checked = result[STORAGE_KEY] !== false;
    toggle.disabled = false;
    setStatus(
      toggle.checked ? "enabled" : "disabled",
      toggle.checked ? "Audio-only mode is active" : "Audio-only mode is paused"
    );
  });

  toggle.addEventListener("change", () => {
    const previousValue = !toggle.checked;
    toggle.disabled = true;
    setStatus("saving", "Saving your preference…");

    chrome.storage.local.set({ [STORAGE_KEY]: toggle.checked }, () => {
      if (chrome.runtime.lastError) {
        toggle.checked = previousValue;
        setStatus("error", `Unable to save setting: ${chrome.runtime.lastError.message}`);
      } else {
        setStatus(
          toggle.checked ? "enabled" : "disabled",
          toggle.checked ? "Audio-only mode is active" : "Audio-only mode is paused"
        );
      }
      toggle.disabled = false;
    });
  });
})();
