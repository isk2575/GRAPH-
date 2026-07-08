import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Roadmap from "./pages/Roadmap";
import CreditDetail from "./pages/CreditDetail";
import Journey from "./pages/Journey";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/roadmap" element={<Roadmap />} />
      <Route path="/credit" element={<CreditDetail />} />
      <Route path="/journey" element={<Journey />} />
    </Routes>
  );
}