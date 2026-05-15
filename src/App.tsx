import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SuperAdminRoute } from "@/components/SuperAdminRoute";
import AppLayout from "@/components/AppLayout";
import Auth from "./pages/Auth";
import SignUp from "./pages/SignUp";
import GuestRegister from "./pages/GuestRegister";
import Dashboard from "./pages/Dashboard";
import Rooms from "./pages/Rooms";
import Bookings from "./pages/Bookings";
import Expenses from "./pages/Expenses";
import Guests from "./pages/Guests";
import Users from "./pages/Users";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/signup-admin-9f3k2" element={<SignUp />} />
            <Route path="/register/:ownerId" element={<GuestRegister />} />
            <Route path="/guest-register/:ownerId" element={<GuestRegister />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/rooms" element={<Rooms />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/guests" element={<Guests />} />
              <Route path="/users" element={<SuperAdminRoute><Users /></SuperAdminRoute>} />
              <Route path="/support" element={<Support />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
