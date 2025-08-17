import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Initialize i18n system before rendering
import "./i18n";

createRoot(document.getElementById("root")!).render(<App />);
