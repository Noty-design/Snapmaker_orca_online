// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Touch-only controls layered over the existing Selkies desktop stream.
// Selkies handles video, mouse/keyboard input and uploads; this script adds shortcuts.
(function () {
  "use strict";
  var compact =
    window.matchMedia("(pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0 ||
    /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  if (!compact) return;

  // Keep Selkies preferences scoped to this page and tolerate disabled storage.
  var storagePrefix = (window.location.origin + window.location.pathname).replace(
    /[^a-zA-Z0-9._-]/g,
    "_",
  );
  function key(name) {
    return storagePrefix + "_" + name;
  }
  function read(name) {
    try {
      return localStorage.getItem(key(name));
    } catch (_) {
      return null;
    }
  }
  function write(name, value) {
    try {
      localStorage.setItem(key(name), String(value));
    } catch (_) {}
  }

  if (read("snapmaker_touch_default_v1") !== "1") {
    write("trackpadMode", "true");
    write("snapmaker_touch_default_v1", "1");
  }
  if (read("scaling_dpi") === null) write("scaling_dpi", "144");
  function currentDpi() {
    var value = parseInt(read("scaling_dpi"), 10);
    return Number.isFinite(value) && value >= 96 && value <= 288 ? value : 144;
  }

  // One-time migration: remove obsolete manual-resolution settings.
  if (
    read("snapmaker_view_default_v2") === "1" &&
    read("snapmaker_resolution_reverted_v3") !== "1"
  ) {
    ["manual_resolution", "manual_width", "manual_height", "snapmaker_view_default_v2"].forEach(
      function (name) {
        try {
          localStorage.removeItem(key(name));
        } catch (_) {}
      },
    );
    write("snapmaker_resolution_reverted_v3", "1");
    var hasReset = false;
    function resetResolution() {
      if (hasReset) return;
      if (!document.getElementById("globalFileInput")) {
        window.setTimeout(resetResolution, 200);
        return;
      }
      hasReset = true;
      window.postMessage({ type: "resetResolutionToWindow" }, window.location.origin);
    }
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        function () {
          window.setTimeout(resetResolution, 250);
        },
        { once: true },
      );
    } else {
      window.setTimeout(resetResolution, 250);
    }
  }

  // Modifier keys: a second tap locks the key until it is pressed again.
  var modifiers = {
    Control: { key: "Control", code: "ControlLeft", prop: "ctrlKey" },
    Alt: { key: "Alt", code: "AltLeft", prop: "altKey" },
    Shift: { key: "Shift", code: "ShiftLeft", prop: "shiftKey" },
  };
  var held = null;
  var heldLocked = false;
  var heldTimer = 0;
  var fnLocked = false;
  var fnLastTap = 0;
  var modifierLastTap = {};
  var modifierButtons = {};
  var fnButton = null;
  var fnKeyButton = null;
  var panButton = null;
  var panMode = false;
  var panTouch = null;
  var doubleTapMs = 380;

  function syntheticKey(type, keyName, code, modifier) {
    var options = { key: keyName, code: code, bubbles: true, cancelable: true };
    if (modifier && modifiers[modifier]) options[modifiers[modifier].prop] = true;
    window.dispatchEvent(new KeyboardEvent(type, options));
  }
  function renderHeld() {
    Object.keys(modifierButtons).forEach(function (name) {
      var button = modifierButtons[name];
      button.dataset.active = held === name ? "true" : "false";
      button.dataset.locked = held === name && heldLocked ? "true" : "false";
      button.setAttribute("aria-pressed", String(held === name && heldLocked));
      button.title =
        held === name
          ? heldLocked
            ? name + " locked - tap to release"
            : name + " temporarily held"
          : name + " (double-tap to lock)";
    });
    [fnButton, fnKeyButton].forEach(function (button) {
      if (!button) return;
      button.textContent = fnLocked ? "Fn🔒" : "Fn";
      button.dataset.locked = fnLocked ? "true" : "false";
      button.setAttribute("aria-pressed", String(fnLocked));
      button.title = fnLocked ? "Fn locked - tap to unlock" : "Fn (double-tap to lock)";
    });
  }
  function releaseHeld(force) {
    if (!held || (heldLocked && !force)) return;
    var old = held;
    held = null;
    heldLocked = false;
    window.clearTimeout(heldTimer);
    heldTimer = 0;
    syntheticKey("keyup", modifiers[old].key, modifiers[old].code, old);
    window.postMessage({ type: "setSynth", value: false }, window.location.origin);
    renderHeld();
  }
  function latchModifier(name) {
    if (!modifiers[name]) return;
    var now = Date.now();
    var isDouble = now - (modifierLastTap[name] || 0) <= doubleTapMs;
    modifierLastTap[name] = now;
    if (held === name && heldLocked) {
      modifierLastTap[name] = 0;
      releaseHeld(true);
      return;
    }
    if (held === name && isDouble) {
      heldLocked = true;
      window.clearTimeout(heldTimer);
      heldTimer = 0;
      renderHeld();
      return;
    }
    releaseHeld(true);
    held = name;
    heldLocked = false;
    window.postMessage({ type: "setSynth", value: true }, window.location.origin);
    syntheticKey("keydown", modifiers[name].key, modifiers[name].code, name);
    heldTimer = window.setTimeout(function () {
      releaseHeld(false);
    }, 8000);
    renderHeld();
  }
  function toggleFn() {
    var now = Date.now();
    if (fnLocked) {
      fnLocked = false;
      fnLastTap = 0;
    } else if (now - fnLastTap <= doubleTapMs) {
      fnLocked = true;
      fnLastTap = 0;
    } else {
      fnLastTap = now;
    }
    showKeysFn();
    renderHeld();
  }
  // Pan is an opt-in touch mode. Selkies already owns two-finger scroll and
  // browser pinch zoom; do not reinterpret those native gestures globally.
  // Its native pointer channel uses button bit 4 for the right mouse button.
  function panRelease() {
    if (!panTouch) return;
    var old = panTouch;
    panTouch = null;
    try {
      if (old.relative) {
        old.input._sendPointer(["m2", 0, 0, 0, 0], false);
      } else {
        old.input._sendPointer(["m", old.input.x, old.input.y, 0, 0], false);
      }
    } catch (_) {}
  }
  function setPanMode(next) {
    if (!next) panRelease();
    panMode = !!next;
    if (panButton) {
      panButton.dataset.active = panMode ? "true" : "false";
      panButton.setAttribute("aria-pressed", String(panMode));
      panButton.title = panMode
        ? "Pan enabled: drag with one finger. Tap Pan to turn it off."
        : "Pan the build plate with one finger";
    }
  }
  function panSurface(target, input) {
    if (!target || !input || !input.element) return false;
    if (target.closest && target.closest("#snapmaker-mobile-controls")) return false;
    return target === input.element || !!(input.element.contains && input.element.contains(target));
  }
  function stopPanEvent(event) {
    if (event.cancelable) event.preventDefault();
    event.stopImmediatePropagation();
  }
  function handlePanTouch(event) {
    if (!panMode) return;
    var input = window.webrtcInput;
    if (!input || !input.inputAttached || typeof input._sendPointer !== "function") {
      panRelease();
      return;
    }
    if (!panTouch && !panSurface(event.target, input)) return;
    // All touches over the streamed viewport are owned by Pan while active;
    // other controls and normal touch handling are untouched when Pan is off.
    stopPanEvent(event);
    if (event.type === "touchstart") {
      if (panTouch || event.touches.length !== 1) {
        panRelease();
        return;
      }
      var first = event.changedTouches[0];
      if (!first) return;
      panTouch = {
        input: input,
        id: first.identifier,
        lastX: first.clientX,
        lastY: first.clientY,
        relative: !!input._trackpadMode,
      };
      try {
        if (panTouch.relative) {
          // Align remote pointer with the finger before the right-button drag.
          // Native Selkies trackpad otherwise drags from an unrelated cursor position.
          input._calculateTouchCoordinates(first);
          input._sendPointer(["m", input.x, input.y, 0, 0], false);
          input._sendPointer(["m2", 0, 0, 4, 0], false);
        } else {
          input._calculateTouchCoordinates(first);
          input._sendPointer(["m", input.x, input.y, 4, 0], false);
        }
      } catch (_) {
        panRelease();
      }
      return;
    }
    if (!panTouch) return;
    if (input !== panTouch.input || event.touches.length > 1) {
      panRelease();
      return;
    }
    var touch = null;
    for (var i = 0; i < event.changedTouches.length; i++) {
      if (event.changedTouches[i].identifier === panTouch.id) {
        touch = event.changedTouches[i];
        break;
      }
    }
    if (!touch) return;
    if (event.type === "touchmove") {
      try {
        if (panTouch.relative) {
          var delta = input._relativeToServer(
            touch.clientX - panTouch.lastX,
            touch.clientY - panTouch.lastY,
          );
          if (delta[0] || delta[1]) input._sendPointer(["m2", delta[0], delta[1], 4, 0], false);
        } else {
          input._calculateTouchCoordinates(touch);
          input._sendPointer(["m", input.x, input.y, 4, 0], false);
        }
        panTouch.lastX = touch.clientX;
        panTouch.lastY = touch.clientY;
      } catch (_) {
        panRelease();
      }
    } else if (event.type === "touchend" || event.type === "touchcancel") {
      panRelease();
    }
  }
  ["touchstart", "touchmove", "touchend", "touchcancel"].forEach(function (name) {
    window.addEventListener(name, handlePanTouch, { capture: true, passive: false });
  });
  document.addEventListener(
    "visibilitychange",
    function () {
      if (document.hidden) panRelease();
    },
    true,
  );
  window.addEventListener("blur", panRelease);
  window.addEventListener("pagehide", panRelease);

  var showKeysFn = function () {};
  function momentaryKey(name, code) {
    var mod = held;
    if (!held) window.postMessage({ type: "setSynth", value: true }, window.location.origin);
    syntheticKey("keydown", name, code, mod);
    window.setTimeout(function () {
      syntheticKey("keyup", name, code, mod);
      if (held && !heldLocked) releaseHeld(false);
      else if (!held)
        window.postMessage({ type: "setSynth", value: false }, window.location.origin);
    }, 60);
  }
  // Return latched Ctrl/Alt/Shift safely after the next touch/keyboard input.
  window.addEventListener(
    "keydown",
    function (event) {
      if (held && !heldLocked && event.isTrusted && event.code !== modifiers[held].code) {
        window.setTimeout(releaseHeld, 120);
      }
    },
    true,
  );
  window.addEventListener(
    "pointerup",
    function (event) {
      if (held && !heldLocked && !event.target.closest("#snapmaker-mobile-controls")) {
        window.setTimeout(releaseHeld, 140);
      }
    },
    true,
  );
  function releaseAll() {
    releaseHeld(true);
    fnLocked = false;
    fnLastTap = 0;
    renderHeld();
  }
  window.addEventListener("blur", releaseAll);
  window.addEventListener("pagehide", releaseAll);
  window.addEventListener("beforeunload", releaseAll);

  // Build a single toolbar once the application document is available.
  function create() {
    if (document.getElementById("snapmaker-mobile-controls")) return;
    // Scope styles to the injected toolbar and temporary zoom/DPI overlays.
    var style = document.createElement("style");
    style.textContent = [
      "#snapmaker-mobile-controls{position:fixed;z-index:2147483000;left:50%;bottom:calc(7px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);",
      "box-sizing:border-box;display:flex;flex-wrap:nowrap;align-items:stretch;gap:3px;padding:5px;width:min(500px,calc(100vw - 12px));",
      "background:rgba(20,30,43,.94);color:white;border:1px solid rgba(255,255,255,.22);border-radius:12px;",
      "box-shadow:0 5px 25px rgba(0,0,0,.35);font:600 12px system-ui,-apple-system,sans-serif}",
      "#snapmaker-mobile-controls button{box-sizing:border-box;flex:1 1 0;min-width:0;min-height:44px;max-height:48px;",
      "border-radius:8px;background:#34475e;color:#f6faff;border:1px solid rgba(255,255,255,.18);",
      "padding:3px 1px;font:inherit;font-size:clamp(10px,2.75vw,12px);white-space:nowrap;overflow:hidden;text-overflow:clip;",
      "touch-action:manipulation;cursor:pointer}",
      "#snapmaker-mobile-controls button:focus-visible{outline:2px solid #93dbff;outline-offset:1px}",
      "#snapmaker-mobile-controls button[data-active=true]{background:#136a77;border-color:#63d4db}",
      "#snapmaker-mobile-controls button[data-locked=true]{background:#9a4d14;border:2px solid #ffc16d;box-shadow:inset 0 0 0 1px #ffe0a9}",
      "#snapmaker-mobile-controls button.pan[data-active=true]{background:#146956;border-color:#8ee8bc}",
      "#snapmaker-mobile-controls button.web-zoom[data-active=true]{background:#6650a6;border-color:#bb9dff}",
      "#snapmaker-browser-zoom-surface{position:absolute;inset:0;z-index:2147482900;",
      "background:transparent;pointer-events:auto;touch-action:auto;cursor:zoom-in}",
      "#snapmaker-mobile-controls button.upload{background:#17637b}",
      "#snapmaker-mobile-controls button.scale{flex:1.25 1 0;font-size:clamp(9px,2.5vw,11px);background:#263b50}",
      "#snapmaker-mobile-controls button.fn{background:#3c4b61}",
      "#snapmaker-mobile-controls button.menu{touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}",
      "#snapmaker-mobile-controls[data-dragging=true]{border-color:#7cd8ef;box-shadow:0 4px 20px #0008,0 0 0 2px #5cd4ed}",
      "#snapmaker-mobile-controls button.scale-picker{flex:1.35 1 0;background:#263b50}",
      "#snapmaker-dpi-menu{position:fixed;z-index:2147483001;display:none;box-sizing:border-box;",
      "width:158px;max-height:min(340px,70vh);overflow-y:auto;padding:5px;border-radius:12px;",
      "background:#152536;border:1px solid #648198;box-shadow:0 8px 30px #000a;color:#fff;",
      "font:600 13px system-ui,-apple-system,sans-serif}",
      "#snapmaker-dpi-menu button{box-sizing:border-box;display:block;width:100%;height:37px;",
      "border:0;border-radius:7px;margin:1px 0;background:transparent;color:#eaf6ff;text-align:left;padding:0 11px;font:inherit}",
      "#snapmaker-dpi-menu button[aria-checked=true]{background:#166c78;color:#fff}",
      "#snapmaker-dpi-menu button:focus-visible{outline:2px solid #a4e2fb}",
      "#snapmaker-mobile-controls button.collapse{flex:.85 1 0}",
      "#snapmaker-mobile-controls button[disabled]{opacity:.83;cursor:default}",
      "#snapmaker-mobile-controls[data-mode=keys] button.keyback{background:#23465c}",
      "#snapmaker-mobile-controls[data-minimized=true]{left:8px;right:auto;bottom:calc(7px + env(safe-area-inset-bottom,0px));",
      "transform:none;display:flex;width:48px;padding:3px;border-radius:12px}",
      "#snapmaker-mobile-controls[data-minimized=true] button:not(.collapse){display:none}",
      "#snapmaker-mobile-controls[data-minimized=true] button.collapse{flex:1 1 auto;min-width:40px;min-height:44px}",
      "@media (max-width:360px){#snapmaker-mobile-controls{gap:2px;padding:4px}",
      "#snapmaker-mobile-controls button{font-size:9px}}",
      "@media (min-width:1100px) and (pointer:fine){#snapmaker-mobile-controls{display:none}}",
    ].join("");
    document.head.appendChild(style);

    // Browser-native pinch requires a touch target which Selkies does not
    // preventDefault().  Only cover its streamed area while Image mode is on.
    // Keep the overlay inside the video container so Selkies menus outside
    // that container remain interactive.
    var browserZoomActive = false;
    var browserZoomButton = null;
    var browserZoomOverlay = document.createElement("div");
    browserZoomOverlay.id = "snapmaker-browser-zoom-surface";
    browserZoomOverlay.setAttribute("aria-label", "Browser zoom over Orca image");
    browserZoomOverlay.style.display = "none";
    var browserZoomParent = null;
    function mountBrowserZoomSurface() {
      var input = window.webrtcInput;
      var parent = input && input.element && input.element.parentElement;
      if (!parent || !parent.contains(input.element)) return false;
      if (browserZoomParent !== parent) {
        parent.appendChild(browserZoomOverlay);
        browserZoomParent = parent;
      }
      return true;
    }
    function setBrowserZoom(next) {
      if (next && !mountBrowserZoomSurface()) return;
      browserZoomActive = !!next;
      browserZoomOverlay.style.display = browserZoomActive ? "block" : "none";
      if (browserZoomActive) setPanMode(false);
      if (browserZoomButton) {
        browserZoomButton.dataset.active = String(browserZoomActive);
        browserZoomButton.setAttribute("aria-pressed", String(browserZoomActive));
        browserZoomButton.title = browserZoomActive
          ? "Image zoom active: pinch or drag the image. Tap Image again for normal controls."
          : "Image zoom: use browser pinch-to-zoom on the image";
      }
    }
    // Controls are independent of the remote desktop DOM and are never sent as clicks.
    var bar = document.createElement("div");
    bar.id = "snapmaker-mobile-controls";
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", "Snapmaker Orca mobile controls");
    bar.dataset.mode = "main";

    function add(text, tip, cls, action) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = text;
      button.title = tip;
      button.setAttribute("aria-label", tip);
      if (cls) button.className = cls;
      button.addEventListener("click", action);
      bar.appendChild(button);
      return button;
    }
    function showMain() {
      bar.dataset.mode = "main";
      Array.from(bar.children).forEach(function (button) {
        button.hidden = button.dataset.group === "keys";
        button.style.display = button.hidden ? "none" : "";
      });
      renderHeld();
    }
    function showKeys() {
      if (typeof closeScaleMenu === "function") closeScaleMenu();
      setBrowserZoom(false);
      setPanMode(false);
      bar.dataset.mode = "keys";
      Array.from(bar.children).forEach(function (button) {
        button.hidden = button.dataset.group === "main";
        button.style.display = button.hidden ? "none" : "";
      });
    }
    function group(button, name) {
      button.dataset.group = name;
      return button;
    }

    showKeysFn = showKeys;
    // A short press opens Selkies; holding the menu button for 450 ms
    // converts it into a drag handle for the entire compact toolbar.
    var menuSkipClickUntil = 0;
    var menuHold = null;
    var menuButton = group(
      add("☰", "Tap: Selkies menu. Hold: move toolbar", "menu", function () {
        if (Date.now() < menuSkipClickUntil) return;
        // Restore native Selkies controls before opening its sidebar.
        setBrowserZoom(false);
        window.postMessage({ type: "toggleDashboard" }, window.location.origin);
      }),
      "main",
    );
    var toolbarPosition = null;
    try {
      toolbarPosition = JSON.parse(read("toolbar_position_v1") || "null");
    } catch (_) {}
    function placeToolbar(x, y, save) {
      var width = bar.getBoundingClientRect().width;
      var height = bar.getBoundingClientRect().height;
      var maxX = Math.max(0, window.innerWidth - width),
        maxY = Math.max(0, window.innerHeight - height);
      var left = Math.max(0, Math.min(maxX, x)),
        top = Math.max(0, Math.min(maxY, y));
      bar.style.left = left + "px";
      bar.style.top = top + "px";
      bar.style.bottom = "auto";
      bar.style.right = "auto";
      bar.style.transform = "none";
      if (save) {
        toolbarPosition = { u: maxX ? left / maxX : 0, v: maxY ? top / maxY : 0 };
        write("toolbar_position_v1", JSON.stringify(toolbarPosition));
      }
    }
    function restoreToolbarPosition() {
      if (!toolbarPosition || bar.dataset.minimized === "true") return;
      // Clear the previous top/left before measuring (important on rotation).
      bar.style.left = "50%";
      bar.style.top = "";
      bar.style.bottom = "";
      bar.style.transform = "translateX(-50%)";
      var rect = bar.getBoundingClientRect();
      placeToolbar(
        (window.innerWidth - rect.width) * toolbarPosition.u,
        (window.innerHeight - rect.height) * toolbarPosition.v,
        false,
      );
    }
    menuButton.addEventListener("contextmenu", function (event) {
      event.preventDefault();
    });
    menuButton.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (menuHold) return;
      var rect = bar.getBoundingClientRect();
      menuHold = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        left: rect.left,
        top: rect.top,
        active: false,
        timer: 0,
      };
      try {
        menuButton.setPointerCapture(event.pointerId);
      } catch (_) {}
      menuHold.timer = window.setTimeout(function () {
        if (!menuHold || menuHold.id !== event.pointerId) return;
        menuHold.active = true;
        menuSkipClickUntil = Date.now() + 600;
        bar.dataset.dragging = "true";
        closeScaleMenu();
      }, 450);
    });
    menuButton.addEventListener("pointermove", function (event) {
      if (!menuHold || event.pointerId !== menuHold.id) return;
      var dx = event.clientX - menuHold.startX,
        dy = event.clientY - menuHold.startY;
      if (!menuHold.active) {
        if (Math.abs(dx) > 12 || Math.abs(dy) > 12) window.clearTimeout(menuHold.timer);
        return;
      }
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
      placeToolbar(menuHold.left + dx, menuHold.top + dy, false);
    });
    function finishMenuHold(event) {
      if (!menuHold || menuHold.id !== event.pointerId) return;
      window.clearTimeout(menuHold.timer);
      if (menuHold.active) {
        menuSkipClickUntil = Date.now() + 600;
        var rect = bar.getBoundingClientRect();
        placeToolbar(rect.left, rect.top, true);
      }
      delete bar.dataset.dragging;
      menuHold = null;
      try {
        menuButton.releasePointerCapture(event.pointerId);
      } catch (_) {}
    }
    menuButton.addEventListener("pointerup", finishMenuHold);
    menuButton.addEventListener("pointercancel", finishMenuHold);
    window.addEventListener("resize", function () {
      if (bar.dataset.minimized !== "true" && !menuHold) restoreToolbarPosition();
      closeScaleMenu();
    });

    var track = group(
      add(
        "Mouse\nPointer",
        "Control the mouse pointer or switch to direct touch",
        "trackpad",
        function () {
          setBrowserZoom(false);
          trackMode = !trackMode;
          write("trackpadMode", trackMode ? "true" : "false");
          window.postMessage(
            { type: trackMode ? "touchinput:trackpad" : "touchinput:touch" },
            window.location.origin,
          );
          renderTrack();
        },
      ),
      "main",
    );
    track.style.whiteSpace = "pre-line";
    track.style.lineHeight = "1.1";
    var trackMode = read("trackpadMode") !== "false";
    function renderTrack() {
      track.textContent = trackMode ? "Mouse\nPointer" : "Direct\nTouch";
      track.dataset.active = trackMode ? "true" : "false";
      track.setAttribute("aria-pressed", String(trackMode));
    }
    renderTrack();
    window.addEventListener("message", function (event) {
      if (
        event.origin !== window.location.origin ||
        !event.data ||
        event.data.type !== "trackpadModeUpdate"
      )
        return;
      trackMode = event.data.enabled === true;
      renderTrack();
    });

    // Display scale is persisted by Selkies and needs a reload to take effect.
    function setDpi(next) {
      next = Math.max(96, Math.min(288, next));
      if (next === currentDpi()) return;
      releaseAll();
      setPanMode(false);
      write("scaling_dpi", String(next));
      window.location.reload();
    }
    var dpiMenu = document.createElement("div");
    dpiMenu.id = "snapmaker-dpi-menu";
    dpiMenu.setAttribute("role", "menu");
    dpiMenu.setAttribute("aria-label", "Select UI scale");
    document.body.appendChild(dpiMenu);
    var scaleButton = group(
      add(
        Math.round((currentDpi() / 96) * 100) + "% ▾",
        "Select UI scale (not screen resolution)",
        "scale-picker",
        function () {
          if (dpiMenu.style.display === "block") {
            closeScaleMenu();
            return;
          }
          dpiMenu.style.display = "block";
          scaleButton.setAttribute("aria-expanded", "true");
          var rect = scaleButton.getBoundingClientRect();
          var width = dpiMenu.offsetWidth,
            height = dpiMenu.offsetHeight;
          dpiMenu.style.left =
            Math.max(6, Math.min(window.innerWidth - width - 6, rect.left)) + "px";
          var top = rect.top - height - 6;
          dpiMenu.style.top =
            (top >= 6 ? top : Math.min(window.innerHeight - height - 6, rect.bottom + 6)) + "px";
        },
      ),
      "main",
    );
    scaleButton.setAttribute("aria-haspopup", "menu");
    scaleButton.setAttribute("aria-expanded", "false");
    function closeScaleMenu() {
      dpiMenu.style.display = "none";
      scaleButton.setAttribute("aria-expanded", "false");
    }
    [96, 120, 144, 168, 192, 216, 240, 264, 288].forEach(function (dpi) {
      var option = document.createElement("button");
      option.type = "button";
      option.textContent = Math.round((dpi / 96) * 100) + "%";
      option.dataset.dpi = String(dpi);
      option.setAttribute("role", "menuitemradio");
      option.setAttribute("aria-checked", String(dpi === currentDpi()));
      option.addEventListener("click", function () {
        closeScaleMenu();
        setDpi(dpi);
      });
      dpiMenu.appendChild(option);
    });
    document.addEventListener(
      "pointerdown",
      function (event) {
        if (
          dpiMenu.style.display === "block" &&
          !dpiMenu.contains(event.target) &&
          event.target !== scaleButton
        )
          closeScaleMenu();
      },
      true,
    );
    window.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeScaleMenu();
    });
    panButton = group(
      add("Pan", "Pan the build plate with one finger", "pan", function () {
        setBrowserZoom(false);
        setPanMode(!panMode);
      }),
      "main",
    );
    panButton.dataset.active = "false";
    panButton.setAttribute("aria-pressed", "false");
    browserZoomButton = group(
      add("Web\nZoom", "Browser zoom: pinch and drag the image", "web-zoom", function () {
        closeScaleMenu();
        setBrowserZoom(!browserZoomActive);
      }),
      "main",
    );
    browserZoomButton.style.whiteSpace = "pre-line";
    browserZoomButton.style.lineHeight = "1.1";
    browserZoomButton.dataset.active = "false";
    browserZoomButton.setAttribute("aria-pressed", "false");
    ["pagehide", "beforeunload"].forEach(function (name) {
      window.addEventListener(name, function () {
        setBrowserZoom(false);
      });
    });
    // Emit a short right-button press/release through the same pointer channel as Pan.
    var rightClickPending = null;
    function releaseRightClick() {
      if (!rightClickPending) return;
      var pending = rightClickPending;
      rightClickPending = null;
      window.clearTimeout(pending.timer);
      try {
        if (pending.relative) pending.input._sendPointer(["m2", 0, 0, 0, 0], false);
        else pending.input._sendPointer(["m", pending.input.x, pending.input.y, 0, 0], false);
      } catch (_) {}
    }
    function sendRightClick() {
      closeScaleMenu();
      setBrowserZoom(false);
      setPanMode(false);
      releaseRightClick();
      var input = window.webrtcInput;
      if (!input || !input.inputAttached || typeof input._sendPointer !== "function") return;
      var relative = !!input._trackpadMode;
      try {
        if (relative) input._sendPointer(["m2", 0, 0, 4, 0], false);
        else input._sendPointer(["m", input.x, input.y, 4, 0], false);
        rightClickPending = {
          input: input,
          relative: relative,
          timer: window.setTimeout(releaseRightClick, 85),
        };
      } catch (_) {
        releaseRightClick();
      }
    }
    var rightClickButton = group(
      add(
        "Right\nClick",
        "Right-click at the remote pointer position",
        "right-click",
        sendRightClick,
      ),
      "main",
    );
    rightClickButton.style.whiteSpace = "pre-line";
    rightClickButton.style.lineHeight = "1.1";
    ["blur", "pagehide", "beforeunload"].forEach(function (eventName) {
      window.addEventListener(eventName, releaseRightClick);
    });
    // Delegate file selection to Selkies instead of creating a separate uploader.
    group(
      add("↑", "Upload STL or 3MF", "upload", function () {
        releaseAll();
        setBrowserZoom(false);
        setPanMode(false);
        window.dispatchEvent(new CustomEvent("requestFileUpload"));
      }),
      "main",
    );

    fnButton = group(add("Fn", "Show and lock modifier keys", "fn", toggleFn), "main");
    // Minimized controls use a fixed restore handle so they are always reachable.
    var collapse = group(
      add("‹", "Minimize toolbar to the left", "collapse", function () {
        var next = bar.dataset.minimized !== "true";
        closeScaleMenu();
        if (next) {
          releaseAll();
          setBrowserZoom(false);
          setPanMode(false);
          showMain();
        }
        // The minimized restore control must remain bottom-left regardless
        // of where the full toolbar was dragged.
        bar.style.left = "";
        bar.style.top = "";
        bar.style.bottom = "";
        bar.style.right = "";
        bar.style.transform = "";
        bar.dataset.minimized = next ? "true" : "false";
        if (!next) restoreToolbarPosition();
        collapse.textContent = next ? "›" : "‹";
        collapse.setAttribute("aria-label", next ? "Show toolbar" : "Minimize toolbar to the left");
        collapse.title = collapse.getAttribute("aria-label");
      }),
      "main",
    );

    group(add("↩", "Back to main toolbar", "keyback", showMain), "keys");
    fnKeyButton = group(
      add("Fn", "Double-tap Fn to lock; tap again to unlock", "fn key-fn", toggleFn),
      "keys",
    );
    ["Control", "Alt", "Shift"].forEach(function (name) {
      var text = name === "Control" ? "Ctrl" : name;
      modifierButtons[name] = group(
        add(text, "Tap to hold temporarily; double-tap to lock", "key-modifier", function () {
          latchModifier(name);
        }),
        "keys",
      );
    });
    [
      ["Esc", "Escape", "Escape"],
      ["Tab", "Tab", "Tab"],
      ["Enter", "Enter", "Enter"],
      ["⌫", "Backspace", "Backspace"],
    ].forEach(function (item) {
      group(
        add(item[0], "Send " + item[1], "key-single", function () {
          momentaryKey(item[1], item[2]);
        }),
        "keys",
      );
    });
    document.body.appendChild(bar);
    showMain();
    renderHeld();
    restoreToolbarPosition();
  }
  // Wait for the document body before mounting controls.
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", create, { once: true });
  else create();
})();
