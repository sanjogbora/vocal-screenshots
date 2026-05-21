const STORAGE_KEY = "vocal-screenshot-generator-state";

const defaultState = {
  view: "expanded",
  streak: "12",
  limits: {
    calories: "1583",
    protein: "120",
    carbs: "120",
    fat: "120",
  },
  meals: [
    {
      id: "breakfast",
      name: "Breakfast",
      expanded: true,
      items: [
        { id: "b1", name: "Chicken sandwich", protein: "11", carbs: "16", fat: "5", calories: "111" },
      ],
    },
    {
      id: "lunch",
      name: "Lunch",
      expanded: true,
      items: [
        { id: "l1", name: "Chicken sandwich", protein: "14", carbs: "20", fat: "9", calories: "140" },
      ],
    },
    {
      id: "dinner",
      name: "Dinner",
      expanded: true,
      items: [
        { id: "d1", name: "Avocado bowl", protein: "12", carbs: "20", fat: "7", calories: "132" },
      ],
    },
  ],
};

let state = loadState();
let addMealMenuOpen = false;

const editor = document.querySelector("#editor");
const phone = document.querySelector("#phone");

const assets = {
  protein: window.VOCAL_ASSET_DATA?.protein || "assets/protein.png",
  carbs: window.VOCAL_ASSET_DATA?.carbs || "assets/carbs.png",
  fat: window.VOCAL_ASSET_DATA?.fat || "assets/fat.png",
  calorie: window.VOCAL_ASSET_DATA?.calorie || "assets/calorie.png",
  chevron: window.VOCAL_ASSET_DATA?.chevron || "assets/chevron.svg",
  streak: window.VOCAL_ASSET_DATA?.streak || "assets/green-tick.svg",
  mic: window.VOCAL_ASSET_DATA?.mic || "assets/mic.svg",
  user: window.VOCAL_ASSET_DATA?.user || "assets/user.svg",
};

const assetImg = (name, className = "asset-icon") =>
  `<img class="${className}" src="${assets[name]}" alt="" aria-hidden="true" />`;

const icons = {
  protein: assetImg("protein"),
  carbs: assetImg("carbs"),
  fat: assetImg("fat"),
  calorie: assetImg("calorie"),
  streak: assetImg("streak", "streak-image"),
  mic: assetImg("mic", "mic-image"),
  user: assetImg("user", "user-image"),
  chevron: assetImg("chevron", "chevron"),
  trash: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 7h16"/>
    <path d="M10 11v6"/>
    <path d="M14 11v6"/>
    <path d="M6 7l1 14h10l1-14"/>
    <path d="M9 7V4h6v3"/>
  </svg>`,
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.meals) && saved.limits) {
      return normalizeState(saved);
    }
  } catch (error) {
    console.warn("Unable to load saved VoCal state", error);
  }
  return structuredClone(defaultState);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeState(input) {
  const next = structuredClone(defaultState);
  next.view = input.view === "collapsed" ? "collapsed" : "expanded";
  next.streak = textOr(input.streak, defaultState.streak);
  next.limits = {
    calories: textOr(input.limits?.calories, defaultState.limits.calories),
    protein: textOr(input.limits?.protein, defaultState.limits.protein),
    carbs: textOr(input.limits?.carbs, defaultState.limits.carbs),
    fat: textOr(input.limits?.fat, defaultState.limits.fat),
  };
  next.meals = input.meals.map((meal, mealIndex) => {
    const items = Array.isArray(meal.items)
      ? meal.items.map((item, itemIndex) => ({
          id: item.id || makeId("item", itemIndex),
          name: String(item.name || "Name of the item"),
          protein: textOr(item.protein, "0"),
          carbs: textOr(item.carbs, "0"),
          fat: textOr(item.fat, "0"),
          calories: textOr(item.calories, "0"),
        }))
      : [];

    return {
      id: meal.id || makeId("meal", mealIndex),
      name: String(meal.name || `Meal ${mealIndex + 1}`),
      expanded: Boolean(meal.expanded),
      items: items.length > 0 ? items : [defaultItem()],
    };
  });
  return next;
}

function textOr(value, fallback) {
  if (value === undefined || value === null) return String(fallback);
  return String(value);
}

function numericValue(value) {
  const source = String(value ?? "").trim().replaceAll(",", "");
  const match = source.match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const number = Number(match[0]);
  if (!Number.isFinite(number)) return 0;
  return /\bk\b/i.test(source) ? number * 1000 : number;
}

function makeId(prefix, index = 0) {
  return `${prefix}-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultItem() {
  return { id: makeId("item"), name: "Name of the item", protein: "0", carbs: "0", fat: "0", calories: "0" };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value) {
  const rounded = Math.round(value);
  return Number.isFinite(rounded) ? String(rounded) : "0";
}

function displayText(value, fallback = "0") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mealTotals(meal) {
  return meal.items.reduce(
    (totals, item) => ({
      calories: totals.calories + numericValue(item.calories),
      protein: totals.protein + numericValue(item.protein),
      carbs: totals.carbs + numericValue(item.carbs),
      fat: totals.fat + numericValue(item.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function dayTotals() {
  return state.meals.reduce(
    (totals, meal) => {
      const current = mealTotals(meal);
      totals.calories += current.calories;
      totals.protein += current.protein;
      totals.carbs += current.carbs;
      totals.fat += current.fat;
      return totals;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function render() {
  const active = captureFocus();
  renderEditor();
  renderPreview();
  saveState();
  restoreFocus(active);
}

function captureFocus() {
  const active = document.activeElement;
  if (!(active instanceof HTMLInputElement) || !active.dataset.key) return null;
  return {
    key: active.dataset.key,
    start: active.selectionStart,
    end: active.selectionEnd,
  };
}

function restoreFocus(active) {
  if (!active) return;
  requestAnimationFrame(() => {
    const target = document.querySelector(`[data-key="${CSS.escape(active.key)}"]`);
    if (!(target instanceof HTMLInputElement)) return;
    target.focus();
    if (target.type !== "number") {
      target.setSelectionRange(active.start, active.end);
    }
  });
}

function renderEditor() {
  document.querySelectorAll("[data-action='set-view']").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.view);
  });

  editor.innerHTML = `
    <section class="editor-section">
      <h2>Limits</h2>
      <div class="limit-grid">
        ${limitField("calories", "Daily calories")}
        ${limitField("protein", "Protein limit")}
        ${limitField("carbs", "Carbs limit")}
        ${limitField("fat", "Fat limit")}
        ${streakField()}
      </div>
    </section>

    <section class="editor-section">
      <div class="field-row">
        <h2>Meals</h2>
        <div class="meal-add-wrapper">
          <button class="text-button" type="button" data-action="toggle-add-menu" aria-expanded="${addMealMenuOpen}">Add meal</button>
          ${
            addMealMenuOpen
              ? `<div class="add-meal-menu">
                  ${["Breakfast", "Lunch", "Dinner", "Snack"]
                    .map((name) => `<button type="button" data-action="add-meal-choice" data-meal-name="${name}">${name}</button>`)
                    .join("")}
                </div>`
              : ""
          }
        </div>
      </div>
      <div class="meal-editor">
        ${state.meals.map(renderMealEditor).join("") || `<div class="empty-state">Add a meal to start building the preview.</div>`}
      </div>
    </section>
  `;
}

function limitField(field, label) {
  return `
    <label>
      ${label}
      <input
        data-key="limit-${field}"
        data-action="limit"
        data-field="${field}"
        value="${escapeHtml(state.limits[field])}"
      />
    </label>
  `;
}

function streakField() {
  return `
    <label>
      Streak
      <input
        data-key="streak"
        data-action="streak"
        value="${escapeHtml(state.streak)}"
      />
    </label>
  `;
}

function renderMealEditor(meal, mealIndex) {
  return `
    <article class="meal-editor-card" data-meal-index="${mealIndex}">
      <div class="meal-editor-header">
        <label>
          Meal name
          <input
            data-key="meal-name-${meal.id}"
            data-action="meal-name"
            data-meal-index="${mealIndex}"
            value="${escapeHtml(meal.name)}"
          />
        </label>
        <button class="icon-button" type="button" data-action="toggle-meal" data-meal-index="${mealIndex}" title="Toggle preview card" aria-label="Toggle ${escapeHtml(meal.name)} card">
          ${icons.chevron}
        </button>
      </div>
      ${meal.items.map((item, itemIndex) => renderItemEditor(item, mealIndex, itemIndex)).join("")}
      <div class="meal-actions">
        <button class="text-button" type="button" data-action="add-item" data-meal-index="${mealIndex}">Add item</button>
        <button class="danger-button" type="button" data-action="remove-meal" data-meal-index="${mealIndex}">Remove meal</button>
      </div>
    </article>
  `;
}

function renderItemEditor(item, mealIndex, itemIndex) {
  const fields = [
    ["calories", "Kcal", "calorie"],
    ["protein", "Pro", "protein"],
    ["carbs", "Carb", "carbs"],
    ["fat", "Fat", "fat"],
  ];
  return `
    <div class="item-row" data-meal-index="${mealIndex}" data-item-index="${itemIndex}">
      <label class="item-name-field">
        <span class="field-label">Item</span>
        <input
          data-key="item-${item.id}-name"
          data-action="item"
          data-meal-index="${mealIndex}"
          data-item-index="${itemIndex}"
          data-field="name"
          value="${escapeHtml(item.name)}"
        />
      </label>
      <div class="item-value-row">
        ${fields
          .map(
            ([field, label, icon]) => `
              <label>
                <span class="field-label">
                  <span class="field-label-icon">${icons[icon]}</span>
                  ${label}
                </span>
                <input
                  data-key="item-${item.id}-${field}"
                  data-action="item"
                  data-meal-index="${mealIndex}"
                  data-item-index="${itemIndex}"
                  data-field="${field}"
                  value="${escapeHtml(item[field])}"
                />
              </label>
            `,
          )
          .join("")}
        <button class="mini-remove" type="button" data-action="remove-item" data-meal-index="${mealIndex}" data-item-index="${itemIndex}" title="Remove item" aria-label="Remove item">
          ${icons.trash}
        </button>
      </div>
    </div>
  `;
}

function renderPreview() {
  const totals = dayTotals();
  const calorieLimit = numericValue(state.limits.calories);
  const caloriesLeft = calorieLimit - totals.calories;
  const remaining = Math.max(0, caloriesLeft);
  const calorieFill = clamp((totals.calories / Math.max(calorieLimit, 1)) * 100, 0, 100);

  phone.innerHTML = `
    <div class="phone-inner">
      <header class="topbar">
        <p class="brand">VoCal</p>
        <div class="streak-tile">
          <span class="streak-icon">${icons.streak}</span>
          <span>${escapeHtml(displayText(state.streak, "12"))}</span>
        </div>
      </header>
      ${renderWeek()}
      <section class="nutrition-grid" aria-label="Nutrition summary">
        <div class="macro-list">
          ${renderMacro("protein", "Proteins", totals.protein, state.limits.protein, "protein-color")}
          ${renderMacro("carbs", "Carbs", totals.carbs, state.limits.carbs, "carbs-color")}
          ${renderMacro("fat", "Fats", totals.fat, state.limits.fat, "fat-color")}
        </div>
        <div class="calorie-column">
          <div class="calorie-heading">
            <span class="calorie-heading-icon">${icons.calorie}</span>
            <p class="calories-title">Calories</p>
          </div>
          <div class="calorie-meter" style="--fill: ${calorieFill}%">
            <div class="calorie-left">
              <strong>${formatNumber(remaining)}</strong>
              <span>kcal left</span>
            </div>
            <div class="calorie-fill">
              <div class="calorie-eaten">
                <strong>${formatNumber(totals.calories)}</strong>
                <span>eaten</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div class="divider"></div>
      <section class="meals-header">
        <p class="meals-title">Meals</p>
        <div class="meal-list">
          ${state.meals.map(renderMealCard).join("") || `<div class="empty-state">No meals yet.</div>`}
        </div>
      </section>
    </div>
  `;
}

function renderWeek() {
  const today = new Date();
  const letters = ["S", "M", "T", "W", "T", "F", "S"];
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setHours(12, 0, 0, 0);
    date.setDate(today.getDate() - (6 - index));
    return [letters[date.getDay()], date.getDate()];
  });
  return `
    <div class="week-row" aria-label="Selected week">
      ${days
        .map(
          ([letter, day], index) => `
            <div class="day-cell ${index === days.length - 1 ? "is-active" : ""}">
              <div class="day-stack">
                <span>${letter}</span>
                <span class="day-dot"></span>
                <span>${day}</span>
              </div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderMacro(kind, label, current, limit, colorClass) {
  const percent = clamp((current / Math.max(numericValue(limit), 1)) * 100, 0, 100);
  return `
    <div class="macro-line ${colorClass}">
      <div class="macro-heading">
        <span class="macro-icon">${icons[kind]}</span>
        <span class="macro-title">${label}</span>
        <span class="macro-value">${formatNumber(current)}g/${escapeHtml(displayText(limit))}</span>
      </div>
      <div class="track ${kind}" style="--fill: ${percent}%"></div>
    </div>
  `;
}

function renderMealCard(meal, mealIndex) {
  const totals = mealTotals(meal);
  const expanded = state.view === "expanded" && meal.expanded;
  return `
    <article class="meal-card ${expanded ? "is-expanded" : ""}">
      ${mealIndex === 0 ? `<button class="voice-fab" type="button" title="Voice entry" aria-label="Voice entry">${icons.mic}</button>` : ""}
      <button class="meal-card-head" type="button" data-action="preview-toggle" data-meal-index="${mealIndex}" aria-expanded="${expanded}">
        <span class="meal-name">${escapeHtml(meal.name)}</span>
        ${icons.chevron}
      </button>
      <div class="meal-summary">
        <div class="summary-macros">
          ${metric("protein", totals.protein)}
          ${metric("carbs", totals.carbs)}
          ${metric("fat", totals.fat)}
        </div>
        ${caloriePill(totals.calories, false)}
      </div>
      ${
        expanded
          ? `<div class="meal-details">
              ${meal.items.map((item) => renderMealItem(item)).join("") || `<div class="meal-item"><p class="item-name">No items yet</p></div>`}
            </div>`
          : ""
      }
    </article>
  `;
}

function renderMealItem(item) {
  return `
    <div class="meal-item">
      <p class="item-name">${escapeHtml(item.name)}</p>
      <div class="meal-summary">
        <div class="item-metrics">
          ${metric("protein", item.protein, true)}
          ${metric("carbs", item.carbs, true)}
          ${metric("fat", item.fat, true)}
        </div>
        ${caloriePill(item.calories, true, true)}
      </div>
    </div>
  `;
}

function metric(kind, value, raw = false) {
  return `
    <span class="metric">
      <span class="metric-icon">${icons[kind]}</span>
      <span>${escapeHtml(raw ? displayText(value) : formatNumber(value))}</span>
    </span>
  `;
}

function caloriePill(value, outline, raw = false) {
  return `
    <span class="calorie-pill ${outline ? "is-outline" : ""}">
      <span class="calorie-crop">${icons.calorie}</span>
      <span>${escapeHtml(raw ? displayText(value) : formatNumber(value))}</span>
    </span>
  `;
}

editor.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const action = target.dataset.action;

  if (action === "limit") {
    state.limits[target.dataset.field] = target.value;
  }

  if (action === "streak") {
    state.streak = target.value;
  }

  if (action === "meal-name") {
    const meal = state.meals[Number(target.dataset.mealIndex)];
    if (meal) meal.name = target.value;
  }

  if (action === "item") {
    const item = state.meals[Number(target.dataset.mealIndex)]?.items[Number(target.dataset.itemIndex)];
    if (!item) return;
    if (target.dataset.field === "name") {
      item.name = target.value;
    } else {
      item[target.dataset.field] = target.value;
    }
  }

  render();
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    if (addMealMenuOpen) {
      addMealMenuOpen = false;
      render();
    }
    return;
  }

  const action = button.dataset.action;

  if (action !== "toggle-add-menu") {
    addMealMenuOpen = false;
  }

  if (action === "set-view") {
    state.view = button.dataset.view === "collapsed" ? "collapsed" : "expanded";
    if (state.view === "expanded") {
      state.meals.forEach((meal) => {
        meal.expanded = true;
      });
    }
  }

  if (action === "toggle-meal" || action === "preview-toggle") {
    state.view = "expanded";
    const meal = state.meals[Number(button.dataset.mealIndex)];
    if (meal) meal.expanded = !meal.expanded;
  }

  if (action === "add-item") {
    const meal = state.meals[Number(button.dataset.mealIndex)];
    if (meal) {
      meal.expanded = true;
      state.view = "expanded";
      meal.items.push(defaultItem());
    }
  }

  if (action === "remove-item") {
    const mealIndex = Number(button.dataset.mealIndex);
    const meal = state.meals[mealIndex];
    if (meal) {
      meal.items.splice(Number(button.dataset.itemIndex), 1);
      if (meal.items.length === 0) {
        state.meals.splice(mealIndex, 1);
      }
    }
  }

  if (action === "toggle-add-menu") {
    addMealMenuOpen = !addMealMenuOpen;
  }

  if (action === "add-meal" || action === "add-meal-choice") {
    const mealName = button.dataset.mealName || "Snack";
    state.view = "expanded";
    state.meals.push({
      id: makeId("meal"),
      name: mealName,
      expanded: true,
      items: [defaultItem()],
    });
  }

  if (action === "remove-meal") {
    state.meals.splice(Number(button.dataset.mealIndex), 1);
  }

  if (action === "reset") {
    state = structuredClone(defaultState);
  }

  if (action === "download") {
    downloadPreview();
    return;
  }

  render();
});

async function downloadPreview() {
  try {
    await downloadRasterPreview();
  } catch (error) {
    console.error("Unable to export VoCal preview", error);
    window.alert("Could not export the PNG. Refresh the page and try again.");
  }
}

async function downloadRasterPreview() {
  const node = document.querySelector(".phone-screen");
  if (!node) throw new Error("Preview node is missing.");
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const width = Math.ceil(node.offsetWidth);
  const height = Math.ceil(node.scrollHeight);
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext("2d");
  context.scale(scale, scale);

  const imageCache = await preloadRenderableImages(node);
  paintRenderableNode(context, node, node.getBoundingClientRect(), imageCache);

  const blob = await canvasToPngBlob(canvas);
  triggerDownload(blob, `vocal-${state.view}-${Date.now()}.png`);
}

async function preloadRenderableImages(root) {
  const images = [...root.querySelectorAll("img")];
  const entries = await Promise.all(
    images.map(async (image) => [image, await loadImage(safeImageSource(image))]),
  );
  return new Map(entries);
}

function safeImageSource(image) {
  const source = image.currentSrc || image.getAttribute("src") || "";
  if (source.startsWith("data:")) return source;

  const embedded = embeddedImageResource(source);
  if (embedded) return embedded;

  throw new Error(`PNG export found a local image URL that was not embedded: ${source}`);
}

function embeddedImageResource(source) {
  const normalized = source.replaceAll("\\", "/").toLowerCase();
  const data = window.VOCAL_ASSET_DATA || {};
  if (normalized.includes("protein.png")) return data.protein;
  if (normalized.includes("carbs.png")) return data.carbs;
  if (normalized.includes("fat.png")) return data.fat;
  if (normalized.includes("calorie.png")) return data.calorie;
  if (normalized.includes("chevron.svg")) return data.chevron;
  if (normalized.includes("green-tick.svg")) return data.streak;
  if (normalized.includes("mic.svg")) return data.mic;
  if (normalized.includes("user.svg")) return data.user;
  return "";
}

function paintRenderableNode(context, node, rootRect, imageCache) {
  if (node.nodeType === Node.TEXT_NODE) {
    paintTextNode(context, node, rootRect);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const element = node;
  if (element.tagName === "SCRIPT" || element.tagName === "STYLE") return;

  const style = getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") return;

  const rect = element.getBoundingClientRect();
  const box = {
    x: rect.left - rootRect.left,
    y: rect.top - rootRect.top,
    width: rect.width,
    height: rect.height,
  };
  const hasBox = box.width > 0 && box.height > 0;

  context.save();
  const opacity = Number.parseFloat(style.opacity);
  if (Number.isFinite(opacity) && opacity < 1) {
    context.globalAlpha *= opacity;
  }

  if (hasBox && clipsContent(style)) {
    roundedRectPath(context, box.x, box.y, box.width, box.height, elementRadii(element, style, box));
    context.clip();
  }

  if (hasBox) {
    paintElementBackground(context, element, style, box);
    paintElementBorder(context, element, style, box);
    paintGeneratedParts(context, element, style, box);

    if (element instanceof HTMLImageElement) {
      paintImageElement(context, element, style, box, imageCache);
    }
  }

  for (const child of orderedChildNodes(element)) {
    paintRenderableNode(context, child, rootRect, imageCache);
  }

  context.restore();
}

function paintElementBackground(context, element, style, box) {
  if (!visibleColor(style.backgroundColor)) return;
  context.fillStyle = style.backgroundColor;
  roundedRectPath(context, box.x, box.y, box.width, box.height, elementRadii(element, style, box));
  context.fill();
}

function paintElementBorder(context, element, style, box) {
  const borders = ["Top", "Right", "Bottom", "Left"].map((side) => ({
    side,
    width: Number.parseFloat(style[`border${side}Width`]) || 0,
    color: style[`border${side}Color`],
    type: style[`border${side}Style`],
  }));
  const visible = borders.filter((border) => border.width > 0 && border.type !== "none" && visibleColor(border.color));
  if (!visible.length) return;

  const sameBorder =
    visible.length === 4 &&
    visible.every(
      (border) =>
        border.width === visible[0].width && border.color === visible[0].color && border.type === visible[0].type,
    );

  if (sameBorder) {
    const borderWidth = visible[0].width;
    const inset = borderWidth / 2;
    context.lineWidth = borderWidth;
    context.strokeStyle = visible[0].color;
    roundedRectPath(
      context,
      box.x + inset,
      box.y + inset,
      Math.max(0, box.width - borderWidth),
      Math.max(0, box.height - borderWidth),
      elementRadii(element, style, box, inset),
    );
    context.stroke();
    return;
  }

  for (const border of visible) {
    context.fillStyle = border.color;
    if (border.side === "Top") context.fillRect(box.x, box.y, box.width, border.width);
    if (border.side === "Right") context.fillRect(box.x + box.width - border.width, box.y, border.width, box.height);
    if (border.side === "Bottom") context.fillRect(box.x, box.y + box.height - border.width, box.width, border.width);
    if (border.side === "Left") context.fillRect(box.x, box.y, border.width, box.height);
  }
}

function paintGeneratedParts(context, element, style, box) {
  if (element.classList.contains("track")) {
    const percent = clamp(Number.parseFloat(style.getPropertyValue("--fill")) || 0, 0, 100);
    if (percent > 0 && visibleColor(style.color)) {
      context.fillStyle = style.color;
      roundedRectPath(
        context,
        box.x,
        box.y,
        (box.width * percent) / 100,
        box.height,
        elementRadii(element, style, box),
      );
      context.fill();
    }
  }

  if (element.classList.contains("day-cell") && element.previousElementSibling) {
    context.fillStyle = "#eee6d6";
    context.fillRect(box.x, box.y + 5.5, 1, Math.max(0, Math.min(54, box.height - 11)));
  }
}

function paintImageElement(context, element, style, box, imageCache) {
  if (element.classList.contains("chevron")) {
    paintChevronIcon(context, style, box);
    return;
  }

  const image = imageCache.get(element);
  if (!image) return;

  const naturalWidth = image.naturalWidth || image.width || box.width;
  const naturalHeight = image.naturalHeight || image.height || box.height;
  let target = { ...box };

  if (style.objectFit === "contain") {
    const fit = Math.min(box.width / naturalWidth, box.height / naturalHeight);
    target.width = naturalWidth * fit;
    target.height = naturalHeight * fit;
    target.x = box.x + (box.width - target.width) / 2;
    target.y = box.y + (box.height - target.height) / 2;
  }

  context.drawImage(image, target.x, target.y, target.width, target.height);
}

function paintChevronIcon(context, style, box) {
  const rotated = style.transform && style.transform !== "none";
  context.save();
  context.translate(box.x + box.width / 2, box.y + box.height / 2);
  if (rotated) context.rotate(Math.PI);
  context.translate(-box.width / 2, -box.height / 2);
  context.fillStyle = "#4e4e4e";
  context.beginPath();
  context.moveTo(box.width * 0.5, box.height * 0.34);
  context.lineTo(box.width * 0.78, box.height * 0.63);
  context.lineTo(box.width * 0.22, box.height * 0.63);
  context.closePath();
  context.fill();
  context.restore();
}

function paintTextNode(context, node, rootRect) {
  const text = node.textContent;
  if (!text.trim()) return;

  const parent = node.parentElement;
  if (!parent) return;

  const style = getComputedStyle(parent);
  if (style.display === "none" || style.visibility === "hidden" || !visibleColor(style.color)) return;

  const lines = textLinesForNode(node);
  if (!lines.length) return;

  const fontSize = Number.parseFloat(style.fontSize) || 16;
  context.font = canvasFont(style);
  context.fillStyle = style.color;
  context.textAlign = "left";
  context.textBaseline = "alphabetic";

  for (const line of lines) {
    const x = line.left - rootRect.left;
    const y = line.top - rootRect.top + (line.height - fontSize) / 2 + fontSize * 0.82;
    context.fillText(line.text, x, y);
  }
}

function textLinesForNode(node) {
  const text = node.textContent;
  const range = document.createRange();
  const lines = [];

  for (let index = 0; index < text.length; index += 1) {
    range.setStart(node, index);
    range.setEnd(node, index + 1);
    const rect = [...range.getClientRects()].find((candidate) => candidate.width > 0 && candidate.height > 0);
    if (!rect) continue;

    let line = lines.find((candidate) => Math.abs(candidate.top - rect.top) < 2);
    if (!line) {
      line = {
        top: rect.top,
        left: rect.left,
        height: rect.height,
        start: index,
        end: index + 1,
      };
      lines.push(line);
    } else {
      line.left = Math.min(line.left, rect.left);
      line.height = Math.max(line.height, rect.height);
      line.start = Math.min(line.start, index);
      line.end = Math.max(line.end, index + 1);
    }
  }

  range.detach();
  return lines
    .sort((a, b) => a.top - b.top)
    .map((line) => ({
      ...line,
      text: text.slice(line.start, line.end).replace(/\s+/g, " ").trim(),
    }))
    .filter((line) => line.text);
}

function canvasFont(style) {
  return `${style.fontStyle || "normal"} ${style.fontWeight || 400} ${style.fontSize} ${style.fontFamily}`;
}

function visibleColor(color) {
  if (!color || color === "transparent") return false;
  return !/rgba?\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(color);
}

function clipsContent(style) {
  return ["hidden", "clip"].includes(style.overflowX) || ["hidden", "clip"].includes(style.overflowY);
}

function orderedChildNodes(element) {
  const nodes = [...element.childNodes];
  const normal = [];
  const positive = [];

  for (const node of nodes) {
    if (node.nodeType === Node.ELEMENT_NODE && positiveZIndex(node)) {
      positive.push(node);
    } else {
      normal.push(node);
    }
  }

  positive.sort((a, b) => childZIndex(a) - childZIndex(b));
  return [...normal, ...positive];
}

function positiveZIndex(element) {
  const style = getComputedStyle(element);
  return style.position !== "static" && childZIndex(element) > 0;
}

function childZIndex(element) {
  const zIndex = Number.parseInt(getComputedStyle(element).zIndex, 10);
  return Number.isFinite(zIndex) ? zIndex : 0;
}

function elementRadii(element, style, box, inset = 0) {
  if (element.classList.contains("calorie-pill") || element.classList.contains("track")) {
    const radius = Math.max(0, box.height / 2 - inset);
    return {
      topLeft: radius,
      topRight: radius,
      bottomRight: radius,
      bottomLeft: radius,
    };
  }

  return borderRadii(style, inset);
}

function borderRadii(style, inset = 0) {
  return {
    topLeft: cssPixel(style.borderTopLeftRadius, inset),
    topRight: cssPixel(style.borderTopRightRadius, inset),
    bottomRight: cssPixel(style.borderBottomRightRadius, inset),
    bottomLeft: cssPixel(style.borderBottomLeftRadius, inset),
  };
}

function cssPixel(value, inset = 0) {
  return Math.max(0, (Number.parseFloat(value) || 0) - inset);
}

function roundedRectPath(context, x, y, width, height, radii) {
  const topLeft = Math.min(radii.topLeft, width / 2, height / 2);
  const topRight = Math.min(radii.topRight, width / 2, height / 2);
  const bottomRight = Math.min(radii.bottomRight, width / 2, height / 2);
  const bottomLeft = Math.min(radii.bottomLeft, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + topLeft, y);
  context.lineTo(x + width - topRight, y);
  if (topRight) {
    context.arcTo(x + width, y, x + width, y + topRight, topRight);
  } else {
    context.lineTo(x + width, y);
  }
  context.lineTo(x + width, y + height - bottomRight);
  if (bottomRight) {
    context.arcTo(x + width, y + height, x + width - bottomRight, y + height, bottomRight);
  } else {
    context.lineTo(x + width, y + height);
  }
  context.lineTo(x + bottomLeft, y + height);
  if (bottomLeft) {
    context.arcTo(x, y + height, x, y + height - bottomLeft, bottomLeft);
  } else {
    context.lineTo(x, y + height);
  }
  context.lineTo(x, y + topLeft);
  if (topLeft) {
    context.arcTo(x, y, x + topLeft, y, topLeft);
  } else {
    context.lineTo(x, y);
  }
  context.closePath();
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("PNG export returned an empty blob."));
        }
      }, "image/png");
    } catch (error) {
      reject(error);
    }
  });
}

async function downloadCanvasPreview() {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const width = 393;
  const height = Math.max(852, estimateCanvasHeight());
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext("2d");
  context.scale(scale, scale);
  context.fillStyle = "#fffdf6";
  context.fillRect(0, 0, width, height);

  const images = await loadCanvasAssets();
  drawCanvasPreview(context, images, width);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Canvas export returned an empty blob.");
  triggerDownload(blob, `vocal-${state.view}-${Date.now()}.png`);
}

function estimateCanvasHeight() {
  let mealHeight = 0;
  for (const meal of state.meals) {
    const expanded = state.view === "expanded" && meal.expanded;
    mealHeight += expanded ? 109 + meal.items.length * 92 : 111;
    mealHeight += 24;
  }
  return 622 + mealHeight + 32;
}

async function loadCanvasAssets() {
  const entries = await Promise.all(
    Object.entries(assets).map(async ([name, source]) => [name, await loadImage(source)]),
  );
  return Object.fromEntries(entries);
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function drawCanvasPreview(context, images, width) {
  const totals = dayTotals();
  const calorieLimit = numericValue(state.limits.calories);
  const remaining = Math.max(0, calorieLimit - totals.calories);
  const calorieFill = clamp(totals.calories / Math.max(calorieLimit, 1), 0, 1);

  drawText(context, "VoCal", 14, 58, { family: "Fraunces", size: 30, weight: 400 });
  roundRect(context, 317, 28, 62, 40, 8, "#f9f3e3");
  drawImageFit(context, images.streak, 329, 40, 16, 16);
  drawText(context, displayText(state.streak, "12"), 351, 52, {
    family: "Plus Jakarta Sans",
    size: 16,
    weight: 700,
    baseline: "middle",
  });

  drawWeekCanvas(context);
  drawMacroCanvas(context, images, "protein", "Proteins", totals.protein, state.limits.protein, 14, 231, "#499f75");
  drawMacroCanvas(context, images, "carbs", "Carbs", totals.carbs, state.limits.carbs, 14, 342, "#0e9fdb");
  drawMacroCanvas(context, images, "fat", "Fats", totals.fat, state.limits.fat, 14, 453, "#d98c46");

  drawImageFit(context, images.calorie, 277, 229, 36, 36);
  drawText(context, "Calories", 318, 252, { family: "Fraunces", size: 20, weight: 300 });
  roundRect(context, 277, 255, 112, 242, 24, "rgba(231, 116, 151, 0.2)");
  const fillHeight = Math.max(58, 242 * calorieFill);
  roundRect(context, 277, 255 + 242 - fillHeight, 112, fillHeight, 24, "#e77497");
  context.fillStyle = "rgba(231, 116, 151, 0.2)";
  context.fillRect(277, 255 + 242 - fillHeight, 112, Math.max(0, fillHeight - 24));
  drawText(context, formatNumber(remaining), 333, 324, {
    family: "Plus Jakarta Sans",
    size: 32,
    weight: 700,
    color: "#862845",
    align: "center",
  });
  drawText(context, "kcal left", 333, 341, {
    family: "Plus Jakarta Sans",
    size: 12,
    color: "#862845",
    align: "center",
  });
  drawText(context, formatNumber(totals.calories), 333, 457, {
    family: "Plus Jakarta Sans",
    size: 24,
    weight: 700,
    color: "#f9f3e3",
    align: "center",
  });
  drawText(context, "eaten", 333, 484, {
    family: "Plus Jakarta Sans",
    size: 16,
    weight: 700,
    color: "#f9f3e3",
    align: "center",
  });

  context.fillStyle = "#eee6d6";
  context.fillRect(0, 529, width, 1);
  drawText(context, "Meals", 14, 584, { family: "Fraunces", size: 24, weight: 300 });

  let y = 622;
  state.meals.forEach((meal, mealIndex) => {
    const expanded = state.view === "expanded" && meal.expanded;
    y = drawMealCanvas(context, images, meal, mealIndex, y, expanded) + 24;
  });
}

function drawWeekCanvas(context) {
  const today = new Date();
  const letters = ["S", "M", "T", "W", "T", "F", "S"];
  const x = 14;
  const y = 134;
  const cellWidth = 365 / 7;
  for (let index = 0; index < 7; index++) {
    const date = new Date(today);
    date.setHours(12, 0, 0, 0);
    date.setDate(today.getDate() - (6 - index));
    if (index === 6) {
      roundRect(context, x + index * cellWidth, y, cellWidth, 65, 8, "#ffdba7");
    }
    if (index > 0) {
      context.fillStyle = "#eee6d6";
      context.fillRect(x + index * cellWidth, y + 5.5, 1, 54);
    }
    const center = x + index * cellWidth + cellWidth / 2;
    drawText(context, letters[date.getDay()], center, y + 22, {
      family: "Plus Jakarta Sans",
      size: 16,
      weight: index === 6 ? 700 : 400,
      align: "center",
    });
    context.fillStyle = "#dda206";
    context.beginPath();
    context.arc(center, y + 33, 1.5, 0, Math.PI * 2);
    context.fill();
    drawText(context, String(date.getDate()), center, y + 52, {
      family: "Plus Jakarta Sans",
      size: 16,
      weight: index === 6 ? 700 : 400,
      align: "center",
    });
  }
}

function drawMacroCanvas(context, images, kind, label, value, limit, x, y, color) {
  drawImageFit(context, images[kind], x, y, 36, 36);
  drawText(context, label, x + 42, y + 24, { family: "Fraunces", size: 20, weight: 300 });
  drawText(context, `${formatNumber(value)}g/${displayText(limit)}`, x + 140, y + 24, {
    family: "Plus Jakarta Sans",
    size: 18,
    weight: 700,
    color,
  });
  const fill = clamp(value / Math.max(numericValue(limit), 1), 0, 1);
  roundRect(context, x, y + 48, 187, 24, 24, `${color}33`);
  roundRect(context, x, y + 48, Math.max(8, 187 * fill), 24, 24, color);
}

function drawMealCanvas(context, images, meal, mealIndex, y, expanded) {
  const cardHeight = expanded ? 109 + meal.items.length * 92 : 111;
  roundRect(context, 14, y, 365, cardHeight, 24, "transparent", "#dda206");
  drawText(context, meal.name, 30, y + 38, { family: "Fraunces", size: 20, weight: 300 });
  drawImageFit(context, images.chevron, 343, y + 22, 24, 24, expanded ? 0 : Math.PI);
  const totals = mealTotals(meal);
  drawMetricCanvas(context, images, "protein", formatNumber(totals.protein), 30, y + 65);
  drawMetricCanvas(context, images, "carbs", formatNumber(totals.carbs), 98, y + 65);
  drawMetricCanvas(context, images, "fat", formatNumber(totals.fat), 166, y + 65);
  drawCaloriePillCanvas(context, images, formatNumber(totals.calories), 277, y + 58, false);
  if (mealIndex === 0) drawImageFit(context, images.mic, 306, y + 60, 64, 64);

  if (!expanded) return y + cardHeight;

  context.fillStyle = "#f9f3e3";
  context.fillRect(30, y + 109, 333, 1);
  let itemY = y + 124;
  for (const item of meal.items) {
    drawText(context, item.name, 30, itemY + 18, { family: "Plus Jakarta Sans", size: 18 });
    drawMetricCanvas(context, images, "protein", displayText(item.protein), 30, itemY + 39);
    drawMetricCanvas(context, images, "carbs", displayText(item.carbs), 98, itemY + 39);
    drawMetricCanvas(context, images, "fat", displayText(item.fat), 166, itemY + 39);
    drawCaloriePillCanvas(context, images, displayText(item.calories), 277, itemY + 35, true);
    itemY += 92;
  }
  return y + cardHeight;
}

function drawMetricCanvas(context, images, kind, value, x, y) {
  drawImageFit(context, images[kind], x, y, 36, 36);
  drawText(context, value, x + 40, y + 20, { family: "Plus Jakarta Sans", size: 16, baseline: "middle" });
}

function drawCaloriePillCanvas(context, images, value, x, y, outline) {
  roundRect(context, x, y, 92, 42, 24, outline ? "transparent" : "#ffdba7", outline ? "#d98c46" : null);
  drawImageFit(context, images.calorie, x + 9, y + 3, 36, 36);
  drawText(context, value, x + 52, y + 22, { family: "Plus Jakarta Sans", size: 16, baseline: "middle" });
}

function drawImageFit(context, image, x, y, width, height, rotation = 0) {
  context.save();
  if (rotation) {
    context.translate(x + width / 2, y + height / 2);
    context.rotate(rotation);
    context.drawImage(image, -width / 2, -height / 2, width, height);
  } else {
    context.drawImage(image, x, y, width, height);
  }
  context.restore();
}

function drawText(context, text, x, y, options = {}) {
  context.save();
  context.font = `${options.weight || 400} ${options.size || 16}px "${options.family || "Plus Jakarta Sans"}"`;
  context.fillStyle = options.color || "#4e4e4e";
  context.textAlign = options.align || "left";
  context.textBaseline = options.baseline || "alphabetic";
  context.fillText(String(text), x, y);
  context.restore();
}

function roundRect(context, x, y, width, height, radius, fill, stroke = null) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
  if (fill && fill !== "transparent") {
    context.fillStyle = fill;
    context.fill();
  }
  if (stroke) {
    context.strokeStyle = stroke;
    context.lineWidth = 1;
    context.stroke();
  }
}

function triggerDownload(blob, filename) {
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

async function inlineCloneImages(root) {
  const images = [...root.querySelectorAll("img")];
  await Promise.all(
    images.map(async (image) => {
      const source = image.getAttribute("src");
      if (!source || source.startsWith("data:")) return;
      image.setAttribute("src", await resourceToDataUrl(source));
    }),
  );
}

async function collectCss() {
  let css = "";
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (!rule.cssText.includes("@media print")) {
          css += `${rule.cssText}\n`;
        }
      }
    } catch {
      // Cross-origin font stylesheets are skipped; the layout stylesheet is local.
    }
  }
  return inlineCssUrls(css);
}

async function inlineCssUrls(css) {
  const matches = [...css.matchAll(/url\(["']?([^"')]+)["']?\)/g)];
  const replacements = await Promise.all(
    matches.map(async (match) => {
      const source = match[1];
      if (source.startsWith("data:")) return [match[0], match[0]];
      return [match[0], `url("${embeddedCssResource(source) || (await resourceToDataUrl(source))}")`];
    }),
  );

  return replacements.reduce((nextCss, [from, to]) => nextCss.replaceAll(from, to), css);
}

function embeddedCssResource(source) {
  const normalized = source.replaceAll("\\", "/").toLowerCase();
  const fonts = window.VOCAL_FONT_DATA || {};
  if (normalized.endsWith("fraunces-300.ttf")) return fonts.fraunces300;
  if (normalized.endsWith("fraunces-400.ttf")) return fonts.fraunces400;
  if (normalized.endsWith("plus-jakarta-400.ttf")) return fonts.jakarta400;
  if (normalized.endsWith("plus-jakarta-500.ttf")) return fonts.jakarta500;
  if (normalized.endsWith("plus-jakarta-700.ttf")) return fonts.jakarta700;
  return "";
}

async function resourceToDataUrl(source) {
  const absolute = new URL(source, document.baseURI).href;
  try {
    const response = await fetch(absolute);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return absolute;
  }
}

render();
