import {Link} from "react-router-dom";
import {Star,MapPin} from "lucide-react";
export default function ProductCard({product}){
 return <div className="product-card">
  <div className="product-image-wrapper"><img src={product.image} alt={product.name} className="product-image"/>
   <span className={"status "+(product.status==="available"?"available":"rented")}>{product.status==="available"?"Available":"Currently Rented"}</span>
  </div>
  <div className="product-content"><div className="product-category">{product.category}</div><h3>{product.name}</h3>
   <div className="rating"><Star size={16} fill="currentColor"/>{product.rating}</div>
   <div className="location"><MapPin size={15}/>{product.location}</div>
   <div className="product-footer"><div><strong>₹{product.price}</strong><small>/day</small></div><span className="days">{product.status==="available"?`${product.availableDays} days available`:"Not available"}</span></div>
   <Link to={`/products/${product.id}`} className="view-btn">View Details</Link>
  </div>
 </div>;
}