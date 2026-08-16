import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext.jsx";

function ProductDetails() {
    const { id } = useParams();
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const [product, setProduct] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const {addToCart} = useCart();

    useEffect(() => {
        fetch(`${BASEURL}/api/products/${id}`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Failed to fetch products");
                }
                return response.json();
            })
            .then((data) => {
                setProduct(data);
                setLoading(false);
            })
            .catch((error) => {
                setError(error);
                setLoading(false);
            });
    }, [id, BASEURL]);


    if (loading) {
        return <div>Loading...</div>
    }

    if (error) {
        return <div>Error: {error}</div>
    }

    if (!product) {
        return <div>Product not found</div>
    }

    return (
        <div className="min-h-screen bg-gray-100 flex justify-center items-center py-10">
            <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-3xl">
                <div className="flex flex-col md:flex-row gap-8">
                    <img
                        src={`${product.image}`}
                        alt={product.name}
                        className="w-full md:w-1/2 h-auto object-cover rounded-lg"
                    />
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-gray-800">
                            {product.name}
                        </h1>
                        <p className="text-gray-600 mb-4">{product.description}</p>
                        <p className="text-gray-600 mb-4">
                            {product.price}
                        </p>
                        <button onClick={()=> addToCart(product.id)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            Add to Cart
                        </button>
                        {/*Home Button*/}
                        <div className="mt-4">
                            <a
                                href="/"
                                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                            >Home
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProductDetails;
