(() => {
  const STORAGE_KEY = "autoAudioEnabled";
  const ENABLED_ATTRIBUTE = "data-auto-audio-mode";
  let enabled = false;
  let observer = null;
  let animationFrame = 0;
  let lastClickAt = 0;

  function getAccessibleText(element) {
    return [
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
      element.innerText,
      element.textContent
    ]
      .filter(Boolean)
      .join(" ")
      .trim()
      .toLowerCase();
  }

  function isSelected(element) {
    const ariaSelected = [
      element.getAttribute("aria-pressed"),
      element.getAttribute("aria-checked"),
      element.getAttribute("aria-selected"),
      element.getAttribute("aria-current"),
      element.getAttribute("data-selected")
    ];

    return (
      ariaSelected.some((value) => value === "true" || value === "page") ||
      element.hasAttribute("selected") ||
      /\b(selected|active|checked|iron-selected)\b/i.test(element.className)
    );
  }

  function findSongAction() {
    const toggle = document.querySelector("ytmusic-av-toggle");
    const controls = toggle
      ? [...toggle.querySelectorAll("button, [role='button'], [role='radio']")]
      : [];

    const songActionPattern = /\b(?:switch|change|set|listen)\s+to\s+song\b|\bsong\s+mode\b/i;
    const songAction = controls.find((control) =>
      songActionPattern.test(getAccessibleText(control))
    );

    if (songAction) {
      return songAction;
    }

    if (toggle) {
      const videoIsSelected = controls.some(
        (control) =>
          /\bvideo\b/i.test(getAccessibleText(control)) && isSelected(control)
      );
      if (videoIsSelected) {
        return controls.find((control) => /\bsong\b/i.test(getAccessibleText(control))) || null;
      }
    }

    const labeledActions = [...document.querySelectorAll("[aria-label], [title]")];
    return (
      labeledActions.find((element) => {
        const isButton =
          element.matches("button, [role='button']") || element.closest("button, [role='button']");
        return isButton && songActionPattern.test(getAccessibleText(element));
      }) || null
    );
  }

  function checkToggle() {
    animationFrame = 0;
    if (!enabled || Date.now() - lastClickAt < 1200) {
      return;
    }

    const songAction = findSongAction();
    if (songAction && songAction.isConnected && !songAction.disabled) {
      lastClickAt = Date.now();
      songAction.click();
    }
  }

  function scheduleCheck() {
    if (enabled && animationFrame === 0) {
      animationFrame = requestAnimationFrame(checkToggle);
    }
  }

  function setEnabled(value) {
    enabled = value;
    if (enabled) {
      document.documentElement.setAttribute(ENABLED_ATTRIBUTE, "true");
      if (!observer) {
        observer = new MutationObserver(scheduleCheck);
        observer.observe(document.documentElement, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: [
            "aria-label",
            "aria-pressed",
            "aria-checked",
            "aria-selected",
            "class",
            "data-selected",
            "title"
          ]
        });
      }
      scheduleCheck();
      return;
    }

    document.documentElement.removeAttribute(ENABLED_ATTRIBUTE);
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (animationFrame !== 0) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  }

  chrome.storage.local.get({ [STORAGE_KEY]: true }, (result) => {
    if (chrome.runtime.lastError) {
      console.error("Could not read audio mode setting:", chrome.runtime.lastError.message);
      setEnabled(true);
      return;
    }
    setEnabled(result[STORAGE_KEY] !== false);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes[STORAGE_KEY]) {
      setEnabled(changes[STORAGE_KEY].newValue !== false);
    }
  });
})();
