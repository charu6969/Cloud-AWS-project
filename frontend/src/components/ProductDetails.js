import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./ProductDetails.css";

function ProductDetails({ user, onCartUpdate }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/products/${id}`
      );
      const data = await response.json();
      setProduct(data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch product:", error);
      setLoading(false);
    }
  };

  const addToCart = async () => {
    if (!user) {
      alert("Please login to add items to cart");
      navigate("/login");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/cart`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ productId: product.id, quantity }),
        }
      );

      if (response.ok) {
        alert("Item added to cart!");
        onCartUpdate();
        navigate("/cart");
      }
    } catch (error) {
      console.error("Failed to add to cart:", error);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!product) return <div className="error">Product not found</div>;

  return (
    <div className="product-details-container">
      <div className="product-details">
        <div className="product-image-large">
          <img src={product.image_url} alt={product.name} />
          <p className="cloud-badge">☁️ Stored in AWS S3</p>
        </div>
        <div className="product-info-detailed">
          <h1>{product.name}</h1>
          <p className="category-badge">{product.category}</p>
          <p className="price-large">${product.price}</p>
          <p className="description">{product.description}</p>

          <div className="stock-info">
            {product.stock > 0 ? (
              <span className="in-stock">
                ✅ {product.stock} items available
              </span>
            ) : (
              <span className="out-of-stock">❌ Out of stock</span>
            )}
          </div>

          <div className="quantity-selector">
            <label>Quantity:</label>
            <input
              type="number"
              min="1"
              max={product.stock}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              disabled={product.stock === 0}
            />
          </div>

          <button
            className="btn-add-large"
            onClick={addToCart}
            disabled={product.stock === 0}
          >
            Add to Cart
          </button>

          <button className="btn-back" onClick={() => navigate(-1)}>
            ← Back to Products
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductDetails;
