import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import CreateAlignment from "./pages/CreateAlignment";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import AlignmentDetail from "./pages/AlignmentDetail";
import Guide from "./pages/Guide";
import Achievements from "./pages/Achievements";
import SelectMilestoneAlignment from "./pages/SelectMilestoneAlignment";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/create-alignment" element={<CreateAlignment />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/alignment/:id" element={<AlignmentDetail />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/select-milestone-alignment/:milestone" element={<SelectMilestoneAlignment />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
