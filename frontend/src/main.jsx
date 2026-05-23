import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import App from "./App";
import MobileView from "./MobileView";

const isMobile =
  window.location.pathname ===
  "/mobile";

ReactDOM.createRoot(
  document.getElementById("root")
).render(

  <React.StrictMode>

    {isMobile
      ? <MobileView />
      : <App />}

  </React.StrictMode>
);