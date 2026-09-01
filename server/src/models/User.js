import mongoose from 'mongoose';
export default mongoose.model('User',new mongoose.Schema({username:{type:String,required:true},email:{type:String,required:true,unique:true},password:{type:String,required:true},role:{type:String,enum:['user','admin'],default:'user'}},{timestamps:true}));
