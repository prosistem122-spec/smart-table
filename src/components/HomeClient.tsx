"use client";

import { useState } from "react";
import Link from "next/link";
import { LeadForm } from "@/components/lead/LeadForm";
import { FunnelApp } from "@/components/funnel/FunnelApp";
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
  const [started, setStarted] = useState(false);
  const [seed, setSeed] = useState({
    restaurantName: initialRestaurantName,
    phone: initialPhone,
  });

  return (
    <div className="funnel-page">
      <div className="stage">
        <div className="brand">
          <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
            Smart Table
          </Link>
        </div>
        <div className="card">
          {!started ? (
            <LeadForm
              initialRestaurantName={initialRestaurantName}
              initialPhone={initialPhone}
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
