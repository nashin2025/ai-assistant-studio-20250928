import { ReactNode } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import FileSidebar from "./file-sidebar";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
          <FileSidebar />
        </div>
      </main>
    </div>
  );
}
