import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "./AppSidebar";

function HamburgerTrigger() {
  const { toggleSidebar } = useSidebar();
  return (
    <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle menu">
      <Menu className="h-5 w-5" />
    </Button>
  );
}

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card px-4 gap-2 sticky top-0 z-10">
            <HamburgerTrigger />
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
