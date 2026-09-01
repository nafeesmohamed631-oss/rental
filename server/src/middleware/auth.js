import jwt from 'jsonwebtoken';
export function auth(req,res,next){const t=req.headers.authorization?.replace('Bearer ','');if(!t)return res.status(401).json({message:'Login required'});try{req.user=jwt.verify(t,process.env.JWT_SECRET);next()}catch{res.status(401).json({message:'Invalid token'})}}
export function adminOnly(req,res,next){if(req.user.role!=='admin')return res.status(403).json({message:'Admin only'});next()}
