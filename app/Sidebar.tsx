"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  username: string;
  avatarUrl: string | null;
  displayName: string;
};

const NAV_ITEMS = [
  { href: "/feed", label: "Feed", icon: "home" },
  { href: "/explore", label: "Explore", icon: "explore" },
  { href: "/about", label: "About", icon: "info" },
  { href: "/profile/me", label: "Home", icon: "person" },
  { href: "/admin", label: "Admin", icon: "shield", adminOnly: true },
];

function NavIcon({ name }: { name: string }) {
  const icons: Record<string, JSX.Element> = {
    home: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    explore: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    person: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    shield: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    info: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
    logout: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
  };
  return icons[name] ?? null;
}

export function Sidebar() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user ?? null);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || !user) return null;

  const profileHref = `/profile/${user.username}`;
  const initial = (user.displayName || user.name || "?")[0].toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Link href="/feed">
          <span className="brand-mark">DS</span>
          <span className="brand-name">DevSpace</span>
        </Link>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          if (item.adminOnly && user.role !== "ADMIN") return null;
          const href = item.href === "/profile/me" ? profileHref : item.href;
          const isActive =
            item.href === "/profile/me"
              ? pathname.startsWith("/profile/")
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={href}
              className={`sidebar-link${isActive ? " active" : ""}`}
            >
              <NavIcon name={item.icon} />
              <span className="sidebar-link-label">{item.label}</span>
            </Link>
          );
        })}

        <button
          className="sidebar-link sidebar-logout-btn"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/";
          }}
        >
          <NavIcon name="logout" />
          <span className="sidebar-link-label">Logout</span>
        </button>
      </nav>

      <div className="sidebar-user">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="post-avatar" />
        ) : (
          <div className="post-avatar-fallback">{initial}</div>
        )}
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{user.displayName}</div>
          <div className="sidebar-user-handle">@{user.username}</div>
        </div>
      </div>
    </aside>
  );
}
