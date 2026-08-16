import { createContext, useContext, useState } from "react";

const CartContext = createContext();

export const CartProvider = ({ childeren }) => {
    const [cartItems, setCartItems] = useState([]);

    // Add Prouct to Cart
    const addToCart = (product, quantity = 1) => {
        const existing = cartItems.find(item => item.id === product.id);

        if (existing) {
            setCartItems(
                cartItems.map((item =>
                    item.id === product.id)
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
                )
            );
        } else {
            setCartItems([...cartItems, { ...product, quantity: 1 }]);
        }
    };


    // Remove Product From Cart
    const removeFromCart = (id) => {
        setCartItems(cartItems.filter(item => item.id !== id));
    };

    // Update Quantity
    const updateQuantity = (id, quantity) => {
        if (quantity < 1) return;
        setCartItems(
            cartItems.map((item) =>
                item.id === id ? { ...item, quantity } : item
            )
        )

    };

    return (
        <CartContext.Provider
            value={{ cartItems, addToCart, removeFromCart, updateQuantity }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);