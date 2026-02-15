"use client";

import { type FC, type ReactNode, useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Button } from "./ui/button";
import { Loader2, MenuIcon } from "lucide-react";
import { useDashboard } from "@/stores/dashboard.store";
import { Toaster } from "./ui/sonner";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useUserStore } from "@/stores/user.store";
import { getUser, sendWhatsAppMessage } from "@/lib/utils";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { PATHS } from "@/types";
import { NotificationModal } from "./notification-modal";
import { useConvex, ConvexProvider } from "convex/react";

const ClientProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const { status } = useSession();
  const { setUser } = useUserStore();
  const r = useRouter();

  // Use React Query to fetch user data
  const { isLoading, data, error } = useQuery({
    queryKey: ["user", status],
    queryFn: () => getUser(),
    enabled: status === "authenticated",
  });

  const { title = data?.fullName?.split(" ")?.[0] || "Dashboard" } =
    useDashboard();

  // Set user data when available
  useEffect(() => {
    if (data && status === "authenticated") {
      setUser(data);
    }
  }, [data, status]);

  useEffect(() => {
    if (error && status === "unauthenticated") {
      r.push(PATHS.SIGNIN);
    }
  }, [error, status]);

  // Show loading state while checking authentication or fetching data
  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={50} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white w-screen relative">
      <Toaster position="top-center" richColors />
      <NotificationModal />
      <Button
        size="sm"
        variant="ringHover"
        className=" fixed bottom-3 right-3 rounded-full p-3 h-[3rem] w-[3rem] z-50"
        onClick={() =>
          sendWhatsAppMessage(
            "+2347040666904",
            `Hello, I want an assistance with`,
          )
        }
      >
        <Image
          alt="whatsapp-image"
          width={30}
          height={30}
          src={`/WhatsApp_Logo_green.svg.png`}
        />
      </Button>
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:fixed lg:flex lg:flex-col xl:w-80 pb-0 overflow-y-auto h-full border-slate-100">
        <div className="flex flex-col justify-between h-full overflow-y-auto">
          <Sidebar onClick={() => {}} className="w-[20rem]" />
        </div>
      </div>

      <header className="p-4 border-b md:hidden border-gray-200 w-full flex items-center justify-between fixed z-30 bg-white">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button size="icon" className="rounded-full" variant="ghost">
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full overflow-y-auto">
            <SheetHeader className="h-[7rem] bg-gray-100 w-full py-7"></SheetHeader>
            <SheetTitle className="sr-only" />
            <Sidebar onClick={() => setIsOpen(false)} className="w-full" />
          </SheetContent>
        </Sheet>
      </header>

      <section className="flex flex-col xl:ml-80 flex-1 overflow-x-hidden min-h-screen lg:pb-0">
        <div className="w-full max-w-3xl md:mx-auto pt-24 md:pt-16 p-4">
          {children}
        </div>
      </section>
    </div>
  );
};

export default ClientProvider;
