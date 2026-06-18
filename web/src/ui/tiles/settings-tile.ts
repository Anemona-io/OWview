import type { Group, Scenario } from "../../parse/types";

/** Values that represent "nothing happening" get dimmed so real losses pop out. */
function isDefaultValue(v: string): boolean {
  const s = v.trim().toLowerCase();
  return s === "0" || s === "off" || s === "" || s === "n/a" || s === "none";
}

export function updateSettingsTile(sc: Scenario): void {
  const wrap = document.getElementById("settings-groups");
  if (!wrap) return;
  wrap.innerHTML = "";
  for (const group of sc.groups) {
    if (!group.kvs.length && !group.notes.length) continue;
    wrap.appendChild(groupPanel(group));
  }
  for (const site of sc.sites) {
    if (site.kvs.length) {
      wrap.appendChild(groupPanel({ title: `Site: ${site.name}`, kvs: site.kvs, notes: site.notes }));
    }
  }
}

function groupPanel(group: Group): HTMLElement {
  const details = document.createElement("details");
  details.className = "tile settings-group";

  const summary = document.createElement("summary");
  summary.textContent = group.title;
  const count = document.createElement("span");
  count.className = "settings-count";
  const active = group.kvs.filter((kv) => !isDefaultValue(kv.value)).length;
  count.textContent = `${active}/${group.kvs.length} set`;
  summary.appendChild(count);
  details.appendChild(summary);

  const dl = document.createElement("dl");
  dl.className = "kv-list";
  for (const kv of group.kvs) {
    const dt = document.createElement("dt");
    dt.textContent = kv.key;
    const dd = document.createElement("dd");
    dd.textContent = kv.value;
    if (isDefaultValue(kv.value)) {
      dt.classList.add("dim");
      dd.classList.add("dim");
    }
    dl.append(dt, dd);
  }
  details.appendChild(dl);

  if (group.notes.length) {
    const notes = document.createElement("p");
    notes.className = "settings-notes";
    notes.textContent = group.notes.join(" · ");
    details.appendChild(notes);
  }
  return details;
}
