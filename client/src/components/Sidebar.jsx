import {LayoutDashboard,Package,ShoppingBag,RotateCcw,Users,FileCheck,AlertTriangle,BarChart3} from "lucide-react";
import {NavLink} from "react-router-dom";
export default function Sidebar({admin=false}){
 const items=admin?[
  ["/admin",<LayoutDashboard size={19}/>,"Dashboard"],
  ["/admin/products",<FileCheck size={19}/>,"Verify Listings"],
  ["/admin/requests",<ShoppingBag size={19}/>,"Rental Requests"],
  ["/admin",<Users size={19}/>,"Manage Users"],
  ["/admin",<AlertTriangle size={19}/>,"Disputes"],
  ["/admin",<BarChart3 size={19}/>,"Payment Reports"]
 ]:[
  ["/dashboard",<LayoutDashboard size={19}/>,"Dashboard"],
  ["/products",<Package size={19}/>,"Browse Products"],
  ["/my-rentals",<ShoppingBag size={19}/>,"My Rentals"],
  ["/my-rentals",<RotateCcw size={19}/>,"Returns"],
  ["/my-rentals","⭐","Reviews"]
 ];
 return <aside className="sidebar"><h3>{admin?"ADMIN PANEL":"MENU"}</h3>{items.map(([to,icon,label],i)=><NavLink key={i} to={to}>{icon}{label}</NavLink>)}</aside>;
}