import Link from "next/link";
import "@/styles/admin.css";

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-shell">
      <nav className="admin-nav">
        <Link href="/admin" className="logo">
          Smart Table Admin
        </Link>
        <Link href="/admin">Inteligência Comercial</Link>
        <Link href="/admin/leads">Potenciais clientes</Link>
        <Link href="/admin/login">Sessão</Link>
      </nav>
      <main className="admin-main">{children}</main>
    </div>
  );
}
