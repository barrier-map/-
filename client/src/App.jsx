import Room from "./pages/Room";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import StudyRoom from "./pages/StudyRoom";
import Study from "./pages/Study";
import Statistics from "./pages/Statistics";
import FloatingRoomWidget from "./components/FloatingRoomWidget";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/studyroom" element={<StudyRoom />} />
        <Route path="/room/:id" element={<Room />} />
        <Route path="/study" element={<Study />} />
        <Route path="/statistics" element={<Statistics />} />
      </Routes>

      <FloatingRoomWidget />
    </BrowserRouter>
  );
}

export default App;