import "./style.css";
import { getState, subscribe } from "./state";
import { initDropzone } from "./ui/dropzone";
import { initNav } from "./ui/nav";
import { initCompareTile } from "./ui/tiles/compare-tile";
import { initMapTile } from "./ui/tiles/map-tile";
import { initTurbinesTile } from "./ui/tiles/turbines-tile";
import { initTypesTile } from "./ui/tiles/types-tile";
import { initMastsTile } from "./ui/tiles/masts-tile";
import { initExportTile } from "./ui/tiles/export-tile";
import { render } from "./ui/render";

initDropzone(document.getElementById("app")!);
initNav();
initCompareTile();
initMapTile();
initTurbinesTile();
initTypesTile();
initMastsTile();
initExportTile();

subscribe(render);

// Initial render (empty state)
render(getState());
