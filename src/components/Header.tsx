import Link from "next/link";
import { getUser } from "@/lib/auth";
import CartLink from "./CartLink";
import LogoutButton from "./LogoutButton";

export default async function Header() {
  const user = await getUser();
  return (
    <header className="top">
      <div className="in gut">
        <Link className="logo" href="/">
          Keithel<small>Buy and sell from Manipur</small>
        </Link>
        <form className="search" action="/" role="search">
          <input name="q" type="search" placeholder="Search products or shops" aria-label="Search products or shops" />
        </form>
        <nav className="main" aria-label="Main">
          <Link href="/">Shop</Link>
          <Link href="/sell">Sell</Link>
          {user && <Link href="/orders">My orders</Link>}
          <CartLink />
          {user?.isAdmin && <Link href="/admin">Admin</Link>}
          {user ? <LogoutButton name={user.name} /> : <Link href="/login">Sign in</Link>}
        </nav>
      </div>
      <div className="weave" aria-hidden="true" />
    </header>
  );
}
