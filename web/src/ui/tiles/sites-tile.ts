import type { Scenario, Site } from "../../parse/types";
import { renderSiteBars } from "../../plots/site-bars";
import { siteColorMap } from "../../plots/palette";
import { fmt } from "../format";

export function updateSitesTile(sc: Scenario, projectSite = ""): void {
  const cards = document.getElementById("site-cards");
  if (cards) {
    cards.innerHTML = "";
    const colors = siteColorMap(sc.sites.map((s) => s.name));
    // Project site first, then the neighbours under a divider.
    const ordered = projectSite
      ? [...sc.sites.filter((s) => s.name === projectSite), ...sc.sites.filter((s) => s.name !== projectSite)]
      : sc.sites;
    let dividerDone = false;
    for (const site of ordered) {
      const neighbour = projectSite !== "" && site.name !== projectSite;
      if (neighbour && !dividerDone) {
        const div = document.createElement("div");
        div.className = "neighbours-divider";
        div.textContent = "Neighbours — external wake source";
        cards.appendChild(div);
        dividerDone = true;
      }
      const card = siteCard(site, colors.get(site.name) ?? "#DD8D57");
      if (projectSite) card.classList.add(neighbour ? "is-neighbour" : "is-project");
      cards.appendChild(card);
    }
  }
  const barsEl = document.getElementById("site-bars-plot");
  if (barsEl) {
    if (sc.sites.some((s) => s.netGwh !== null)) renderSiteBars(barsEl, sc, projectSite);
    else barsEl.textContent = "No per-site energy summary found.";
  }
}

function siteCard(site: Site, color: string): HTMLElement {
  const card = document.createElement("div");
  card.className = "tile site-card";
  card.style.borderTop = `3px solid ${color}`;

  const name = document.createElement("div");
  name.className = "site-card-name";
  name.textContent = site.name;

  const sub = document.createElement("div");
  sub.className = "site-card-sub";
  const n = site.nTurbines ?? site.turbines.length;
  sub.textContent = `${n || "?"} turbines · ${fmt(site.mw, 1)} MW`;

  const grid = document.createElement("div");
  grid.className = "site-card-grid";
  const cells: [string, string][] = [
    ["Net", site.netGwh !== null ? `${fmt(site.netGwh, 1)} GWh` : "—"],
    ["CF", site.cf !== null ? `${fmt(site.cf, 1)}%` : "—"],
    ["Array eff", site.arrayEff !== null ? `${fmt(site.arrayEff, 1)}%` : "—"],
    ["Topo eff", site.topoEff !== null ? `${fmt(site.topoEff, 1)}%` : "—"],
    ["Free wind", site.meanFreeSpeed !== null ? `${fmt(site.meanFreeSpeed, 2)} m/s` : "—"],
    ["Gross", site.grossGwh !== null ? `${fmt(site.grossGwh, 1)} GWh` : "—"],
  ];
  for (const [k, v] of cells) {
    const label = document.createElement("span");
    label.className = "tile-label";
    label.textContent = k;
    const value = document.createElement("span");
    value.className = "site-card-value";
    value.textContent = v;
    const cell = document.createElement("div");
    cell.append(label, value);
    grid.appendChild(cell);
  }

  card.append(name, sub, grid);
  return card;
}
