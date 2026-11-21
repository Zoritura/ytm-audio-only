(() => {
  const STORAGE_KEY = "autoAudioEnabled";
  const ENABLED_ATTRIBUTE = "data-auto-audio-mode";
  const PLAYER_ART_SELECTOR = "#song-image, #song-image-container";
  const HIDDEN_ELEMENTS_SELECTOR =
    `video, #song-video, #song-video-container, ${PLAYER_ART_SELECTOR}`;
  const HIDDEN_PROPERTIES = ["display", "opacity", "visibility", "pointer-events"];
  const ACTION_PATTERN =
    /\b(?:switch|change|set|listen)\s+(?:to\s+)?song\b|\bsong\s+mode\b|\baudio\s+only\b/i;
  const VIDEO_PATTERN = /\bvideo\b/i;
  const SONG_PATTERN = /\bsong\b/i;

  let enabled = false;
  let documentObserver = null;
  let checkFrame = 0;
  let lastClickAt = 0;
  const shadowObservers = new Map();
  const hiddenElements = new Map();

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

  function hideElement(element) {
    if (!hiddenElements.has(element)) {
      hiddenElements.set(
        element,
        HIDDEN_PROPERTIES.map((property) => ({
          property,
          value: element.style.getPropertyValue(property),
          priority: element.style.getPropertyPriority(property)
        }))
      );
    }

    if (
      element.style.getPropertyValue("opacity") !== "0" ||
      element.style.getPropertyPriority("opacity") !== "important"
    ) {
      element.style.setProperty("opacity", "0", "important");
    }
    if (
      element.style.getPropertyValue("visibility") !== "hidden" ||
      element.style.getPropertyPriority("visibility") !== "important"
    ) {
      element.style.setProperty("visibility", "hidden", "important");
    }
    if (
      element.style.getPropertyValue("pointer-events") !== "none" ||
      element.style.getPropertyPriority("pointer-events") !== "important"
    ) {
      element.style.setProperty("pointer-events", "none", "important");
    }
    if (
      element.matches(PLAYER_ART_SELECTOR) &&
      (element.style.getPropertyValue("display") !== "none" ||
        element.style.getPropertyPriority("display") !== "important")
    ) {
      element.style.setProperty("display", "none", "important");
    }
  }

  function restoreHiddenElements() {
    for (const [element, previousStyles] of hiddenElements) {
      for (const { property, value, priority } of previousStyles) {
        if (value) {
          element.style.setProperty(property, value, priority);
        } else {
          element.style.removeProperty(property);
        }
      }
    }
    hiddenElements.clear();
  }

  function observeShadowRoot(root) {
    if (shadowObservers.has(root)) {
      return;
    }

    const observer = new MutationObserver(handleMutations);
    observer.observe(root, {
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
        "id",
        "role",
        "title"
      ]
    });
    shadowObservers.set(root, observer);
    scanSubtree(root);
  }

  function processElement(element) {
    if (!enabled) {
      return;
    }

    if (element.matches(HIDDEN_ELEMENTS_SELECTOR)) {
      hideElement(element);
    }
    if (element.shadowRoot) {
      observeShadowRoot(element.shadowRoot);
    }
  }

  function scanSubtree(node) {
    if (!enabled || !node) {
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      processElement(node);
    }
    if (typeof node.querySelectorAll === "function") {
      for (const element of node.querySelectorAll("*")) {
        processElement(element);
      }
    }
  }

  function handleMutations(records) {
    if (!enabled) {
      return;
    }

    for (const record of records) {
      if (record.type === "childList") {
        for (const node of record.addedNodes) {
          scanSubtree(node);
        }
      } else if (record.target.nodeType === Node.ELEMENT_NODE) {
        processElement(record.target);
      }
    }
    scheduleCheck();
  }

  function getComposedDescendants(element) {
    const descendants = [];
    const pending = [...element.children];
    if (element.shadowRoot) {
      pending.push(...element.shadowRoot.children);
    }

    while (pending.length > 0) {
      const current = pending.pop();
      descendants.push(current);
      pending.push(...current.children);
      if (current.shadowRoot) {
        pending.push(...current.shadowRoot.children);
      }
    }
    return descendants;
  }

  function getOpenRoots() {
    return [document, ...shadowObservers.keys()];
  }

  function findSongAction() {
    const roots = getOpenRoots();
    const toggles = roots.flatMap((root) =>
      [...root.querySelectorAll("ytmusic-av-toggle")]
    );

    for (const toggle of toggles) {
      const controls = getComposedDescendants(toggle).filter((element) =>
        element.matches("button, [role='button'], [role='radio'], [role='tab']")
      );
      const action = controls.find((control) =>
        ACTION_PATTERN.test(getAccessibleText(control))
      );
      if (action) {
        return action;
      }

      const videoIsSelected = controls.some(
        (control) =>
          VIDEO_PATTERN.test(getAccessibleText(control)) && isSelected(control)
      );
      if (videoIsSelected) {
        const songControl = controls.find((control) =>
          SONG_PATTERN.test(getAccessibleText(control))
        );
        if (songControl) {
          return songControl;
        }
      }
    }

    for (const root of roots) {
      const labeledElements = root.querySelectorAll("[aria-label], [title]");
      for (const element of labeledElements) {
        const clickable =
          element.matches("button, [role='button']") ||
          element.closest("button, [role='button']");
        if (clickable && ACTION_PATTERN.test(getAccessibleText(element))) {
          return element;
        }
      }
    }
    return null;
  }

  function checkToggle() {
    checkFrame = 0;
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
    if (enabled && checkFrame === 0) {
      checkFrame = requestAnimationFrame(checkToggle);
    }
  }

  function startObserving() {
    if (!documentObserver) {
      documentObserver = new MutationObserver(handleMutations);
      documentObserver.observe(document.documentElement, {
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
          "id",
          "role",
          "title"
        ]
      });
    }
    scanSubtree(document.documentElement);
    scheduleCheck();
  }

  function stopObserving() {
    if (documentObserver) {
      documentObserver.disconnect();
      documentObserver = null;
    }
    for (const observer of shadowObservers.values()) {
      observer.disconnect();
    }
    shadowObservers.clear();

    if (checkFrame !== 0) {
      cancelAnimationFrame(checkFrame);
      checkFrame = 0;
    }
    restoreHiddenElements();
  }

  function setEnabled(value) {
    enabled = value;
    if (enabled) {
      document.documentElement.setAttribute(ENABLED_ATTRIBUTE, "true");
      startObserving();
      return;
    }

    document.documentElement.removeAttribute(ENABLED_ATTRIBUTE);
    stopObserving();
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
