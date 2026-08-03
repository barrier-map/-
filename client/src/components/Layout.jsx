import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ children }) {
  return (
    <div className="app">
      <Sidebar />

      <main className="main">
        <Topbar />

        {children}
      </main>
    </div>
  );
}