import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ThemeProvider } from "./components/ThemeProvider";
import { ToastProvider } from "./components/ToastProvider";
import { StoreProvider } from "./lib/store/StoreProvider";
import { I18nProvider } from "./i18n/I18nProvider";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <StoreProvider>
          <I18nProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </I18nProvider>
        </StoreProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
