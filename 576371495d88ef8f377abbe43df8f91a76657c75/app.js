const data = window.KSAO_DATA;

const state = {
  view: "hiring",
  hiring: {
    role: "Technician",
    sector: "Automotive",
    capability: "All capabilities",
    types: new Set(data.types),
    search: "",
    selected: new Set(),
  },
  capability: {
    sector: "Automotive",
    family: "All",
    selected: new Set(["Execution"]),
  },
  library: {
    search: "",
    type: "All types",
    role: "All roles",
    sector: "All sectors",
  },
};

const typeClass = {
  Knowledge: "type-Knowledge",
  Skill: "type-Skill",
  Ability: "type-Ability",
  "Other characteristics": "type-Other",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value) {
  return String(value ?? "").toLowerCase().trim();
}

function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function capabilityByName(name) {
  return data.capabilities.find((capability) => capability.name === name);
}

function ksaoByName(name) {
  return data.ksaos.find((ksao) => ksao.name === name);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function sortKsaos(items) {
  return [...items].sort((a, b) => {
    const typeDiff = data.types.indexOf(a.type) - data.types.indexOf(b.type);
    return typeDiff || a.name.localeCompare(b.name);
  });
}

function renderSegmented(container, values, active, onSelect) {
  container.innerHTML = values
    .map(
      (value) =>
        `<button type="button" class="${value === active ? "is-active" : ""}" data-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`,
    )
    .join("");
  container.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => onSelect(button.dataset.value));
  });
}

function renderTypeCheckboxes() {
  const container = $("#hiringTypes");
  container.innerHTML = data.types
    .map(
      (type) => `
        <label class="check-row">
          <input type="checkbox" value="${escapeHtml(type)}" ${state.hiring.types.has(type) ? "checked" : ""} />
          <span>${escapeHtml(type)}</span>
        </label>
      `,
    )
    .join("");
  container.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) state.hiring.types.add(input.value);
      else state.hiring.types.delete(input.value);
      resetHiringSelection();
      renderHiring();
    });
  });
}

function renderCapabilitySelect() {
  const select = $("#hiringCapability");
  const options = ["All capabilities", ...data.capabilities.map((capability) => capability.name)];
  select.innerHTML = options
    .map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
    .join("");
  select.value = state.hiring.capability;
  select.addEventListener("change", () => {
    state.hiring.capability = select.value;
    resetHiringSelection();
    renderHiring();
  });
}

function hiringPool() {
  const query = normalize(state.hiring.search);
  return sortKsaos(
    data.ksaos.filter((ksao) => {
      const roleMatch = ksao.roles.includes(state.hiring.role);
      const sectorMatch = ksao.sectors.includes(state.hiring.sector);
      const typeMatch = state.hiring.types.has(ksao.type);
      const capMatch =
        state.hiring.capability === "All capabilities" ||
        ksao.capabilityNames.includes(state.hiring.capability);
      const searchMatch = !query || ksao.searchText.includes(query);
      return roleMatch && sectorMatch && typeMatch && capMatch && searchMatch;
    }),
  );
}

function resetHiringSelection() {
  state.hiring.selected = new Set(hiringPool().map((ksao) => ksao.name));
}

function renderKsaoCard(ksao, selected, checkboxName) {
  const capabilityTags = ksao.capabilityNames
    .slice(0, 3)
    .map((capability) => `<span class="tag">${escapeHtml(capability)}</span>`)
    .join("");
  return `
    <article class="ksao-card ${selected ? "" : "is-muted"}">
      <input type="checkbox" name="${checkboxName}" value="${escapeHtml(ksao.name)}" ${selected ? "checked" : ""} aria-label="Select ${escapeHtml(ksao.name)}" />
      <div>
        <h4>${escapeHtml(ksao.name)}</h4>
        <p>${escapeHtml(ksao.definition)}</p>
        <div class="tag-row">
          <span class="tag ${typeClass[ksao.type]}">${escapeHtml(ksao.type)}</span>
          ${capabilityTags}
        </div>
      </div>
    </article>
  `;
}

function selectedHiringItems() {
  const pool = hiringPool();
  return sortKsaos(pool.filter((ksao) => state.hiring.selected.has(ksao.name)));
}

function renderHiring() {
  renderSegmented($("#roleSelector"), data.roles, state.hiring.role, (value) => {
    state.hiring.role = value;
    resetHiringSelection();
    renderHiring();
  });
  renderSegmented($("#sectorSelector"), data.sectors, state.hiring.sector, (value) => {
    state.hiring.sector = value;
    resetHiringSelection();
    renderHiring();
  });

  const pool = hiringPool();
  const selected = selectedHiringItems();
  $("#hiringResultCount").textContent = `${selected.length} of ${pool.length} selected`;
  $("#hiringList").innerHTML = pool.length
    ? pool.map((ksao) => renderKsaoCard(ksao, state.hiring.selected.has(ksao.name), "hiringKsao")).join("")
    : `<div class="empty-state">No KSAOs match the current filters.</div>`;

  $("#hiringList").querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) state.hiring.selected.add(input.value);
      else state.hiring.selected.delete(input.value);
      renderHiring();
    });
  });

  renderHiringBlueprint(selected);
}

function groupByType(items) {
  return data.types
    .map((type) => ({ type, items: items.filter((ksao) => ksao.type === type) }))
    .filter((group) => group.items.length);
}

function renderHiringBlueprint(items) {
  const capabilityNames = unique(items.flatMap((ksao) => ksao.capabilityNames));
  const grouped = groupByType(items);
  const typeSummary = grouped
    .map((group) => `${plural(group.items.length, group.type)}`)
    .join(", ");
  const roleLead =
    `${state.hiring.role} in ${state.hiring.sector} maintenance` +
    (state.hiring.capability === "All capabilities" ? "" : ` with emphasis on ${state.hiring.capability}`);

  $("#hiringBlueprint").innerHTML = `
    <div class="blueprint-block">
      <h4>Position frame</h4>
      <p><strong>${escapeHtml(roleLead)}</strong>. Use the selected KSAOs as the competence backbone for the role profile, screening criteria, and interview guide.</p>
      <p>${items.length ? `Current blueprint contains ${items.length} KSAOs: ${escapeHtml(typeSummary)}.` : "Select at least one KSAO to build the blueprint."}</p>
    </div>
    <div class="blueprint-block">
      <h4>Capability contribution</h4>
      <p>${capabilityNames.length ? escapeHtml(capabilityNames.join(", ")) : "No capability contribution selected yet."}</p>
    </div>
    ${grouped
      .map(
        (group) => `
          <div class="blueprint-block">
            <h4>${escapeHtml(group.type)}</h4>
            <ul>
              ${group.items
                .map(
                  (ksao) =>
                    `<li><strong>${escapeHtml(ksao.name)}:</strong> ${escapeHtml(ksao.definition)} <em>${escapeHtml(ksao.exemplar)}</em></li>`,
                )
                .join("")}
            </ul>
          </div>
        `,
      )
      .join("")}
    <div class="blueprint-block">
      <h4>Suggested workplace-ad wording</h4>
      <p>We are looking for a ${escapeHtml(state.hiring.role.toLowerCase())} who can contribute to maintenance performance in ${escapeHtml(state.hiring.sector.toLowerCase())} operations through ${escapeHtml(items.slice(0, 8).map((ksao) => ksao.name.toLowerCase()).join(", "))}${items.length > 8 ? ", and related maintenance capabilities" : ""}.</p>
    </div>
  `;
}

function renderCapabilityPicker() {
  const filtered = data.capabilities.filter(
    (capability) => state.capability.family === "All" || capability.type === state.capability.family,
  );
  $("#capabilityPicker").innerHTML = filtered
    .map(
      (capability) => `
        <label class="capability-option">
          <input type="checkbox" value="${escapeHtml(capability.name)}" ${state.capability.selected.has(capability.name) ? "checked" : ""} />
          <span>
            <strong>${escapeHtml(capability.name)}</strong>
            <span>${escapeHtml(capability.type)} capability, ${plural(capability.ksaos.length, "KSAO")}</span>
          </span>
        </label>
      `,
    )
    .join("");
  $("#capabilityPicker").querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) state.capability.selected.add(input.value);
      else state.capability.selected.delete(input.value);
      renderCapability();
    });
  });
}

function selectedCapabilityItems() {
  const selectedCaps = [...state.capability.selected]
    .map(capabilityByName)
    .filter(Boolean);
  const names = unique(selectedCaps.flatMap((capability) => capability.ksaos));
  return sortKsaos(
    names
      .map(ksaoByName)
      .filter(Boolean)
      .filter((ksao) => ksao.sectors.includes(state.capability.sector)),
  );
}

function renderRoleFocus(items) {
  const counts = data.roles.map((role) => ({
    role,
    count: items.filter((ksao) => ksao.roles.includes(role)).length,
  }));
  const max = Math.max(1, ...counts.map((entry) => entry.count));
  $("#roleFocus").innerHTML = counts
    .sort((a, b) => b.count - a.count || a.role.localeCompare(b.role))
    .map(
      (entry) => `
        <div class="role-bar">
          <div class="role-bar-head">
            <span>${escapeHtml(entry.role)}</span>
            <span>${entry.count}</span>
          </div>
          <div class="bar-track" aria-hidden="true">
            <div class="bar-fill" style="width: ${(entry.count / max) * 100}%"></div>
          </div>
        </div>
      `,
    )
    .join("");
}

function renderCapability() {
  renderSegmented($("#capabilitySectorSelector"), data.sectors, state.capability.sector, (value) => {
    state.capability.sector = value;
    renderCapability();
  });
  renderCapabilityPicker();

  const items = selectedCapabilityItems();
  const selectedCaps = [...state.capability.selected].map(capabilityByName).filter(Boolean);
  $("#capabilityKsaosCount").textContent = plural(items.length, "KSAO");
  $("#capabilitySelectionCount").textContent = plural(selectedCaps.length, "capability", "capabilities");
  renderRoleFocus(items);
  renderCapabilityBlueprint(selectedCaps, items);
}

function renderCapabilityBlueprint(capabilities, items) {
  const roleCounts = data.roles
    .map((role) => ({
      role,
      items: items.filter((ksao) => ksao.roles.includes(role)),
    }))
    .filter((entry) => entry.items.length)
    .sort((a, b) => b.items.length - a.items.length);
  const grouped = groupByType(items);

  $("#capabilityBlueprint").innerHTML = capabilities.length
    ? `
      <div class="blueprint-block">
        <h4>Capability target in ${escapeHtml(state.capability.sector)}</h4>
        <ul>
          ${capabilities
            .map(
              (capability) =>
                `<li><strong>${escapeHtml(capability.name)} (${escapeHtml(capability.type)}):</strong> ${escapeHtml(capability.description)}</li>`,
            )
            .join("")}
        </ul>
      </div>
      <div class="blueprint-block">
        <h4>Roles to involve</h4>
        <ul>
          ${roleCounts
            .map(
              (entry) =>
                `<li><strong>${escapeHtml(entry.role)}:</strong> focus on ${escapeHtml(entry.items.slice(0, 8).map((ksao) => ksao.name).join(", "))}${entry.items.length > 8 ? ", and related KSAOs" : ""}.</li>`,
            )
            .join("")}
        </ul>
      </div>
      ${grouped
        .map(
          (group) => `
            <div class="blueprint-block">
              <h4>${escapeHtml(group.type)} focus</h4>
              <ul>
                ${group.items
                  .map(
                    (ksao) =>
                      `<li><strong>${escapeHtml(ksao.name)}:</strong> ${escapeHtml(ksao.definition)} <em>${escapeHtml(ksao.exemplar)}</em></li>`,
                  )
                  .join("")}
              </ul>
            </div>
          `,
        )
        .join("")}
    `
    : `<div class="empty-state">Select one or more capabilities to build guidance.</div>`;
}

function renderLibraryFilters() {
  $("#libraryType").innerHTML = ["All types", ...data.types]
    .map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
    .join("");
  $("#libraryRole").innerHTML = ["All roles", ...data.roles]
    .map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
    .join("");
  $("#librarySector").innerHTML = ["All sectors", ...data.sectors]
    .map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
    .join("");

  ["libraryType", "libraryRole", "librarySector"].forEach((id) => {
    $(`#${id}`).addEventListener("change", (event) => {
      const key = id.replace("library", "").toLowerCase();
      state.library[key] = event.target.value;
      renderLibrary();
    });
  });
}

function renderLibrary() {
  const query = normalize(state.library.search);
  const items = sortKsaos(
    data.ksaos.filter((ksao) => {
      const searchMatch = !query || ksao.searchText.includes(query);
      const typeMatch = state.library.type === "All types" || ksao.type === state.library.type;
      const roleMatch = state.library.role === "All roles" || ksao.roles.includes(state.library.role);
      const sectorMatch =
        state.library.sector === "All sectors" || ksao.sectors.includes(state.library.sector);
      return searchMatch && typeMatch && roleMatch && sectorMatch;
    }),
  );
  $("#libraryList").innerHTML = items.length
    ? items.map((ksao) => renderKsaoCard(ksao, true, "libraryKsao")).join("")
    : `<div class="empty-state">No KSAOs match the current filters.</div>`;
  $("#libraryList").querySelectorAll("input").forEach((input) => {
    input.style.display = "none";
  });
}

function visibleBlueprintText(selector) {
  return $(selector).innerText.replace(/\n{3,}/g, "\n\n").trim();
}

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const original = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => {
      button.textContent = original;
    }, 1100);
  } catch {
    window.prompt("Copy this text", text);
  }
}

function initNavigation() {
  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      $$(".nav-item").forEach((item) => item.classList.toggle("is-active", item === button));
      $$(".view").forEach((view) => view.classList.remove("is-active"));
      $(`#${state.view}View`).classList.add("is-active");
    });
  });
}

function initCapabilityFamily() {
  $("#capabilityFamilySelector").querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.capability.family = button.dataset.family;
      if (state.capability.family !== "All") {
        const visibleCapabilities = data.capabilities.filter(
          (capability) => capability.type === state.capability.family,
        );
        state.capability.selected = new Set(
          [...state.capability.selected].filter((name) =>
            visibleCapabilities.some((capability) => capability.name === name),
          ),
        );
        if (!state.capability.selected.size && visibleCapabilities[0]) {
          state.capability.selected.add(visibleCapabilities[0].name);
        }
      }
      $("#capabilityFamilySelector")
        .querySelectorAll("button")
        .forEach((item) => item.classList.toggle("is-active", item === button));
      renderCapability();
    });
  });
}

function initEvents() {
  $("#hiringSearch").addEventListener("input", (event) => {
    state.hiring.search = event.target.value;
    resetHiringSelection();
    renderHiring();
  });
  $("#selectAllHiring").addEventListener("click", () => {
    hiringPool().forEach((ksao) => state.hiring.selected.add(ksao.name));
    renderHiring();
  });
  $("#clearHiring").addEventListener("click", () => {
    state.hiring.selected.clear();
    renderHiring();
  });
  $("#printHiring").addEventListener("click", () => window.print());
  $("#copyHiring").addEventListener("click", (event) =>
    copyText(visibleBlueprintText("#hiringBlueprint"), event.currentTarget),
  );
  $("#copyCapability").addEventListener("click", (event) =>
    copyText(visibleBlueprintText("#capabilityBlueprint"), event.currentTarget),
  );
  $("#librarySearch").addEventListener("input", (event) => {
    state.library.search = event.target.value;
    renderLibrary();
  });
}

function init() {
  $("#sourceName").textContent = data.source;
  $("#ksaoCount").textContent = data.summary.ksaoCount;
  $("#capabilityCount").textContent = data.summary.capabilityCount;

  renderCapabilitySelect();
  renderTypeCheckboxes();
  renderLibraryFilters();
  initNavigation();
  initCapabilityFamily();
  initEvents();

  resetHiringSelection();
  renderHiring();
  renderCapability();
  renderLibrary();
}

init();
