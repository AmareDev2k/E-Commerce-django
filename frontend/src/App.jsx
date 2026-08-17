import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProductList from "./pages/ProductList.jsx";
import ProductDetails from "./pages/ProductDetails.jsx";
import CartPage from "./pages/CartPage.jsx";
import Navbar from "./components/Navbar.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";

function App() {
  return (
    <Router>
      <Navbar/>
      <Routes>
        <Route path="/" element={<ProductList />} />
        <Route path="/product/:id" element={<ProductDetails/>} />
        <Route path="/cart" element={<CartPage/>} />
        <Route path="/checkout" element={<CheckoutPage/>} />
      </Routes>
    </Router>
  );
}

export default App;