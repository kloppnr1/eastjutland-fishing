import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App";
import "./index.css";

// Enable bounce effect on iOS
if (Capacitor.getPlatform() === "ios") {
  import("capacitor-plugin-ios-webview-configurator").then(({ setWebviewBounce }) => {
    setWebviewBounce(true);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
