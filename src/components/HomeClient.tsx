"use client";

import { useEffect } from "react";
import Link from "next/link";
import { FunnelApp } from "@/components/funnel/FunnelApp";
import {
  setupUnloadFlush,
  startInactivityWatcher,
} from "@/lib/tracking/client";
import { recordPageVisit } from "@/lib/tracking/visit-api";
import "@/styles/funnel.css";

interface Props {
  whatsappNumber: string;
  initialRestaurantName?: string;
  initialPhone?: string;
}

export function HomeClient({
  whatsappNumber,
  initialRestaurantName = "",
  initialPhone = "",
}: Props) {
  useEffect(() => {
    void recordPageVisit("video");
    setupUnloadFlush();
    return startInactivityWatcher(
      Number(process.env.NEXT_PUBLIC_INACTIVE_AFTER_MS) || 15 * 60 * 1000
    );
  }, []);

  return (
    <div className="funnel-page">
      <div className="stage">
        <div className="brand">
          <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
            Smart Table
          </Link>
        </div>
        <div className="card">
          <FunnelApp
            seedRestaurantName={initialRestaurantName}
            seedPhone={initialPhone}
            whatsappNumber={whatsappNumber}
          />
        </div>
        <div className="footer-tag">A nova era dos restaurantes</div>
      </div>
    </div>
  );
}
