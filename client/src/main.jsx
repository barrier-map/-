import { Buffer } from "buffer";

window.Buffer = Buffer;
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { StudyProvider } from "./context/StudyContext";
import { AuthProvider } from "./context/AuthContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <StudyProvider>
        <App />
      </StudyProvider>
    </AuthProvider>
  </React.StrictMode>
);