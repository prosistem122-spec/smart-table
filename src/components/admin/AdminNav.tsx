"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Inteligência Comercial", exact: true },
  { href: "/admin/leads", label: "Potenciais Clientes", exact: false },
  { href: "/admin/video", label: "Vídeos", exact: false },
  { href: "/admin/login", label: "Sessão", exact: false },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="admin-nav" role="banner">
      <div className="admin-nav-inner">
        <Link href="/admin" className="admin-logo">
          <span className="admin-logo-mark" aria-hidden />
          <span className="admin-logo-text">
            Smart Table <em>Admin</em>
          </span>
        </Link>
        <nav className="admin-nav-links" aria-label="Navegação principal">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                isActive(l.href, l.exact) ? "admin-nav-link active" : "admin-nav-link"
              }
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
