import "@fontsource-variable/onest";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/catalogue.css";
import "./styles/product.css";
import "./styles/panels.css";
import "./styles/dropdown.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing application root");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
