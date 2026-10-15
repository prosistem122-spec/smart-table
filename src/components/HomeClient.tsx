"use client";

import { useState } from "react";
import { LeadForm } from "@/components/lead/LeadForm";
import { FunnelApp } from "@/components/funnel/FunnelApp";
import "@/styles/funnel.css";

interface Props {
  whatsappNumber: string;
}

export function HomeClient({ whatsappNumber }: Props) {
  const [started, setStarted] = useState(false);
  const [seed, setSeed] = useState({ restaurantName: "", phone: "" });

  return (
    <div className="funnel-page">
      <div className="stage">
        <div className="brand">Smart Table</div>
        <div className="card">
          {!started ? (
            <LeadForm
              onStarted={(info) => {
                setSeed(info);
                setStarted(true);
              }}
            />
          ) : (
            <FunnelApp
              seedRestaurantName={seed.restaurantName}
              seedPhone={seed.phone}
              whatsappNumber={whatsappNumber}
            />
          )}
        </div>
        <div className="footer-tag">A nova era dos restaurantes</div>
      </div>
    </div>
  );
}
