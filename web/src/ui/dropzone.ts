import { parseWorkbook } from "../parse/blocks";
import { ParseError, type ParsedWorkbook } from "../parse/types";
import { setError, setWorkbook } from "../state";

/** Route a thrown parse error to state, preserving diagnostics when present. */
function reportError(err: unknown): void {
  if (err instanceof ParseError) setError(err.message, err.diagnostics);
  else setError(String(err));
}

export function initDropzone(root: HTMLElement): void {
  // Whole-page drag overlay
  const overlay = document.getElementById("drop-overlay")!;

  let dragDepth = 0;

  document.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dragDepth++;
    overlay.classList.add("visible");
  });

  document.addEventListener("dragleave", () => {
    dragDepth--;
    if (dragDepth <= 0) {
      dragDepth = 0;
      overlay.classList.remove("visible");
    }
  });

  document.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  document.addEventListener("drop", (e) => {
    e.preventDefault();
    dragDepth = 0;
    overlay.classList.remove("visible");
    const file = e.dataTransfer?.files[0];
    if (file) loadFile(file);
  });

  // File input fallback (click "load file" button)
  const input = document.getElementById("file-input") as HTMLInputElement;
  input?.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) loadFile(file);
    input.value = "";
  });

  // "Try sample" link
  const sampleBtn = document.getElementById("sample-btn");
  sampleBtn?.addEventListener("click", async () => {
    let wb: ParsedWorkbook;
    try {
      const res = await fetch("example.xlsx");
      if (!res.ok) throw new Error("Sample file not found");
      wb = parseWorkbook(await res.arrayBuffer());
    } catch (err) {
      reportError(err);
      return;
    }
    setWorkbook(wb, "example.xlsx");
  });

  // Drop onto hero area
  root.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (file) loadFile(file);
  });
  root.addEventListener("dragover", (e) => e.preventDefault());
}

function loadFile(file: File): void {
  const reader = new FileReader();
  reader.onload = () => {
    let wb: ParsedWorkbook;
    try {
      wb = parseWorkbook(reader.result as ArrayBuffer);
    } catch (err) {
      reportError(err);
      return;
    }
    // Render outside the try: a plot/render error must not masquerade as a
    // parse failure (which would also blank the whole report).
    setWorkbook(wb, file.name);
  };
  reader.readAsArrayBuffer(file);
}
