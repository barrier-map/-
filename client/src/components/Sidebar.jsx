import { Link } from "react-router-dom";
import {
  Home,
  Video,
  Calendar,
  BarChart3,
  BookOpen,
  Settings,
} from "lucide-react";

import "./Sidebar.css";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <h1 className="logo">🏡 다락방</h1>

      <nav>
        <Link to="/dashboard">
          <Home size={20} />
          홈
        </Link>

        <Link to="/studyroom">
          <Video size={20} />
          캠스터디
        </Link>

        <Link to="/study">
          <BookOpen size={20} />
          공부
        </Link>

        <Link to="/calendar">
          <Calendar size={20} />
          달력
        </Link>

        <Link to="/statistics">
          <BarChart3 size={20} />
          통계
        </Link>

        <Link to="/settings">
          <Settings size={20} />
          설정
        </Link>
      </nav>
    </aside>
  );
}