import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { applyAppearance } from "./appearance";

applyAppearance();

// One page, three windows: the pill (no view), the dashboard, and the
// full-screen alert flash. Rust opens each with its own ?view=. Lazy imports
// so each window loads only its own code and CSS (their styles would clash).
const view = new URLSearchParams(location.search).get("view");
const Root = lazy(() =>
  view === "dashboard" ? import("./Dashboard") : view === "flash" ? import("./Flash") : import("./App"),
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      <Root />
    </Suspense>
  </React.StrictMode>,
);
