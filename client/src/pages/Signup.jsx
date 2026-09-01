import {useState} from "react";
import {Link,useNavigate} from "react-router-dom";
import {UserPlus} from "lucide-react";
export default function Signup(){
 const navigate=useNavigate(); const [form,setForm]=useState({username:"",email:"",password:"",confirmPassword:"",role:"user"});
 const change=e=>setForm({...form,[e.target.name]:e.target.value});
 const submit=e=>{e.preventDefault();if(form.password!==form.confirmPassword)return alert("Passwords do not match");localStorage.setItem("user",JSON.stringify({username:form.username,email:form.email,role:form.role}));navigate(form.role==="admin"?"/admin":"/dashboard")};
 return <div className="auth-page"><div className="auth-card"><div className="auth-icon"><UserPlus/></div><h1>Create Account</h1><p>Join SmartRent today</p>
 <form onSubmit={submit}><label>Username</label><input name="username" value={form.username} onChange={change} placeholder="Enter username" required/>
 <label>Email</label><input type="email" name="email" value={form.email} onChange={change} placeholder="Enter email" required/>
 <label>Password</label><input type="password" name="password" value={form.password} onChange={change} placeholder="Enter password" required/>
 <label>Confirm Password</label><input type="password" name="confirmPassword" value={form.confirmPassword} onChange={change} placeholder="Confirm password" required/>
 <label>Account Type</label><select name="role" value={form.role} onChange={change}><option value="user">User</option><option value="admin">Admin - Demo</option></select>
 <button className="primary-btn">Create Account</button></form><p className="auth-bottom">Already have an account? <Link to="/login">Login</Link></p></div></div>;
}