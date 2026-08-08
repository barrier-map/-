import { Buffer } from "buffer";

window.Buffer = Buffer;
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { StudyProvider } from "./context/StudyContext";
import { AuthProvider } from "./context/AuthContext";
import { AlertProvider } from "./context/AlertContext";
import { RoomProvider } from "./context/RoomContext";
import { PomodoroProvider } from "./context/PomodoroContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <StudyProvider>
        <AlertProvider>
          <RoomProvider>
            <PomodoroProvider>
              <App />
            </PomodoroProvider>
          </RoomProvider>
        </AlertProvider>
      </StudyProvider>
    </AuthProvider>
  </React.StrictMode>
);