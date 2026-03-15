import React from "react";
import ReactDOM from "react-dom/client";
import "@excalidraw/excalidraw/index.css";
import "./index.css";

const rootNode = document.getElementById("root") as HTMLElement;
const root = ReactDOM.createRoot(rootNode);

function renderBootError(error: unknown) {
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}\n\n${error.stack ?? ""}`
      : String(error);

  root.render(
    <div
      style={{
        height: "100%",
        padding: "24px",
        background: "#fffdfa",
        color: "#7a1f1f",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        whiteSpace: "pre-wrap",
      }}
    >
      {message}
    </div>,
  );
}

window.addEventListener("error", (event) => {
  renderBootError(event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  renderBootError(event.reason);
});

void import("./App.tsx")
  .then(({ App }) => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  })
  .catch((error) => {
    renderBootError(error);
  });
