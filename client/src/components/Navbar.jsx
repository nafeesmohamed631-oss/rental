import {Link,useNavigate} from "react-router-dom";
import {Bell,LogOut,Search,User} from "lucide-react";
export default function Navbar(){
 const navigate=useNavigate(); const user=JSON.parse(localStorage.getItem("user"));
 const logout=()=>{localStorage.removeItem("user");navigate("/login")};
 return <nav className="navbar">
  <Link to={user?.role==="admin"?"/admin":"/dashboard"} className="logo">Smart<span>Rent</span></Link>
  <div className="nav-search"><Search size={18}/><input placeholder="Search products..."/></div>
  <div className="nav-actions"><Bell size={20}/><div className="profile"><User size={20}/><span>{user?.username}</span></div><button className="logout-btn" onClick={logout}><LogOut size={18}/>Logout</button></div>
 </nav>;
}