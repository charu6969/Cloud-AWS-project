import React from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";

function Navbar({ user, cartCount, onLogout }) {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          ☁️ CloudCommerce
        </Link>
        <ul className="navbar-menu">
          <li>
            <Link to="/">Products</Link>
          </li>
          {user && (
            <>
              <li>
                <Link to="/orders">My Orders</Link>
              </li>
              <li>
                <Link to="/cart" className="cart-link">
                  🛒 Cart{" "}
                  {cartCount > 0 && (
                    <span className="cart-badge">{cartCount}</span>
                  )}
                </Link>
              </li>
              {user.role === "admin" && (
                <li>
                  <Link to="/admin">Admin</Link>
                </li>
              )}
            </>
          )}
        </ul>
        <div className="navbar-auth">
          {user ? (
            <>
              <span className="user-greeting">Hello, {user.name}</span>
              <button onClick={onLogout} className="btn-logout">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-login">
                Login
              </Link>
              <Link to="/register" className="btn-register">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
