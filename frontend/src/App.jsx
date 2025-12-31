import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ProductList from "./components/ProductList.jsx";
import ProductDetails from "./components/ProductDetails.jsx";
import Cart from "./components/Cart.jsx";
import Checkout from "./components/Checkout.jsx";
import Login from "./components/Login.jsx";
import Register from "./components/Register.jsx";
import Orders from "./components/Orders.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    // Check for stored auth token
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (token && userData) {
      setUser(JSON.parse(userData));
      fetchCartCount();
    }
  }, []);

  const fetchCartCount = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/cart`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setCartCount(data.itemCount || 0);
    } catch (error) {
      console.error("Failed to fetch cart count:", error);
    }
  };

  const handleLogin = (userData, token) => {
    setUser(userData);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    fetchCartCount();
  };

  const handleLogout = () => {
    setUser(null);
    setCartCount(0);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return (
    <Router>
      <div className="App">
        <Navbar user={user} cartCount={cartCount} onLogout={handleLogout} />
        <Routes>
          <Route
            path="/"
            element={<ProductList user={user} onCartUpdate={fetchCartCount} />}
          />
          <Route
            path="/products/:id"
            element={
              <ProductDetails user={user} onCartUpdate={fetchCartCount} />
            }
          />
          <Route
            path="/cart"
            element={
              user ? (
                <Cart onCartUpdate={fetchCartCount} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/checkout"
            element={
              user ? (
                <Checkout onCartUpdate={fetchCartCount} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/orders"
            element={user ? <Orders /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin"
            element={
              user && user.role === "admin" ? (
                <AdminDashboard />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route
            path="/register"
            element={<Register onLogin={handleLogin} />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
