import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./ProductList.css";

function ProductList({ user, onCartUpdate }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      // Accessing API via Vite environment variable
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/products`
      );
      const data = await response.json();
      setProducts(data.products || []);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setLoading(false);
    }
  };

  const addToCart = async (productId) => {
    if (!user) {
      alert("Please login to add items to cart");
      return;
    }

    setAddingId(productId);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/cart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, quantity: 1 }),
      });

      if (response.ok) {
        alert("Item added to cart!");
        onCartUpdate();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to add to cart");
      }
    } catch (error) {
      console.error("Failed to add to cart:", error);
      alert("Network error. Please try again later.");
    } finally {
      setAddingId(null);
    }
  };

  const categories = ["all", ...new Set(products.map((p) => p.category))];

  const filteredProducts = products.filter((product) => {
    const matchesCategory = filter === "all" || product.category === filter;
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="product-list-container">
        <div className="loading-state">
          <p>Fetching your cloud-ready products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="product-list-container">
      <header className="product-header">
        <h1>Explore Our Collection</h1>
        <div className="cloud-info">
          <span className="cloud-badge">☁️ High Availability</span>
          <p>
            <strong>CO1:</strong> Images via S3 | <strong>CO2:</strong> RDS Data
            |<strong>CO4:</strong> EC2 Instances
          </p>
        </div>
      </header>

      <section className="product-controls">
        <div className="search-wrapper">
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <nav className="category-filters">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-btn ${filter === cat ? "active" : ""}`}
              onClick={() => setFilter(cat)}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </nav>
      </section>

      <main className="product-grid">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <article key={product.id} className="product-card">
              <div className="product-image-container">
                <Link to={`/products/${product.id}`}>
                  <img
                    src={product.image_url}
                    alt={product.name}
                    loading="lazy"
                    onError={(e) => {
                      e.target.src =
                        "https://via.placeholder.com/400x300?text=Image+Not+Available";
                    }}
                  />
                </Link>
                {product.stock <= 5 && product.stock > 0 && (
                  <span className="stock-warning">Low Stock</span>
                )}
              </div>

              <div className="product-info">
                <h3>{product.name}</h3>
                <p className="product-description">{product.description}</p>

                <div className="product-footer">
                  <div className="price-tag">
                    <span className="currency">$</span>
                    <span className="amount">{product.price}</span>
                  </div>
                  <span
                    className={`stock-status ${
                      product.stock > 0 ? "in-stock" : "out-of-stock"
                    }`}
                  >
                    {product.stock > 0
                      ? `${product.stock} units left`
                      : "Sold Out"}
                  </span>
                </div>

                <button
                  className="btn-add-cart"
                  onClick={() => addToCart(product.id)}
                  disabled={product.stock === 0 || addingId === product.id}
                >
                  {addingId === product.id
                    ? "Adding..."
                    : product.stock === 0
                    ? "Unavailable"
                    : "Add to Cart"}
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="no-results">
            <p>No products match your criteria.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default ProductList;
