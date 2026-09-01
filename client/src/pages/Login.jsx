import {useState} from "react";
import {Link,useNavigate} from "react-router-dom";
import {LogIn} from "lucide-react";
export default function Login(){
 const navigate=useNavigate();const [email,setEmail]=useState("");const [password,setPassword]=useState("");
 const submit=e=>{e.preventDefault();const user=JSON.parse(localStorage.getItem("user"));if(!user)return alert("Account not found. Please signup first.");if(user.email!==email)return alert("Invalid email");localStorage.setItem("user",JSON.stringify(user));navigate(user.role==="admin"?"/admin":"/dashboard")};
 return <div className="auth-page"><div className="auth-card"><div className="auth-icon"><LogIn/></div><h1>Welcome Back</h1><p>Login to SmartRent</p>
 <form onSubmit={submit}><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter email" required/><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password" required/><button className="primary-btn">Login</button></form>
 <p className="auth-bottom">Don't have an account? <Link to="/signup">Create Account</Link></p></div></div>;
}