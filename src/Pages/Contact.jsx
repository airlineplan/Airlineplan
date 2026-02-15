import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Send, User, Mail, MessageSquare, 
  Loader2, Type, MapPin, Phone, ArrowLeft 
} from 'lucide-react';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Ensure this path matches your project structure exactly
import backgroundPic from "../assets/Images/contactPic.jpeg";

// --- UI COMPONENTS ---

const InputField = ({ label, icon: Icon, type = "text", multiline = false, ...props }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-white uppercase tracking-wider ml-1 drop-shadow-sm">
      {label}
    </label>
    <div className="relative group">
      <div className={`absolute left-0 pl-3 flex items-center pointer-events-none text-indigo-200 group-focus-within:text-indigo-400 transition-colors ${multiline ? 'top-3' : 'inset-y-0'}`}>
        <Icon size={18} />
      </div>
      {multiline ? (
        <textarea
          // Changed bg to very light transparent white, removed blur, made borders clearer
          className="block w-full pl-10 pr-3 py-3 bg-white/5 border border-white/30 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all duration-200 placeholder:text-white/40 min-h-[120px] resize-none"
          {...props}
        />
      ) : (
        <input
          type={type}
          // Changed bg to very light transparent white, removed blur, made borders clearer
          className="block w-full pl-10 pr-3 py-3 bg-white/5 border border-white/30 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all duration-200 placeholder:text-white/40"
          {...props}
        />
      )}
    </div>
  </div>
);

const ContactInfoItem = ({ icon: Icon, text, subtext }) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    // Removed hover background, added text shadow for readability
    className="flex items-start gap-4 p-2 rounded-xl transition-colors group"
  >
    <div className="p-2.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30 shadow-sm group-hover:bg-indigo-500/40 transition-colors">
      <Icon size={20} className="text-indigo-100" />
    </div>
    <div>
      <h4 className="text-sm font-bold text-white tracking-tight drop-shadow-sm">{text}</h4>
      <p className="text-xs text-indigo-100/80 mt-0.5 font-medium drop-shadow-sm">{subtext}</p>
    </div>
  </motion.div>
);

// --- MAIN COMPONENT ---

export default function Contact() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post('http://localhost:5001/send-contactEmail', formData);
      toast.success('Message sent successfully!');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error sending message. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Changed bg-slate-900 to bg-black as base
    <div className="min-h-screen w-full relative font-sans flex items-center justify-center p-4 lg:p-8 overflow-hidden bg-black">
      
      {/* --- FULL SCREEN BACKGROUND --- */}
      <div className="absolute inset-0 z-0">
        <motion.div 
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 10, ease: "easeOut" }}
          className="absolute inset-0 z-0 opacity-100"
          style={{
            backgroundImage: `url(${backgroundPic})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        {/* Reduced overlay opacity significantly and removed blur to make image pop */}
        <div className="absolute inset-0 z-10 bg-black/40" />
      </div>

      {/* --- CENTRAL TRANSPARENT CONTAINER --- */}
      {/* Removed all background colors, blurs, shadows, and borders from the main container */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-20 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-5 rounded-3xl overflow-hidden min-h-[600px]"
      >
        
        {/* LEFT PANEL: Info (Takes 2 columns) */}
        {/* Removed border-r */}
        <div className="lg:col-span-2 p-8 lg:p-12 text-white flex flex-col justify-between relative">
          
          {/* Top Content */}
          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center text-indigo-200 hover:text-white transition-colors mb-8 text-xs font-bold uppercase tracking-widest group drop-shadow-sm">
              <ArrowLeft size={14} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Home
            </Link>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* Added drop shadow to text for readability against image */}
              <h1 className="text-3xl lg:text-5xl font-extrabold mb-4 tracking-tight leading-tight text-white drop-shadow-lg">
                Let's chat about your plans.
              </h1>
              <p className="text-indigo-100 text-base leading-relaxed mb-8 drop-shadow-md">
                Ready to optimize your fleet and schedules? Our team provides the insights you need.
              </p>
            </motion.div>

            <div className="space-y-4">
              <ContactInfoItem 
                icon={Mail} 
                text="Email Us" 
                subtext="admin@airlineplan.com" 
              />
              <ContactInfoItem 
                icon={MapPin} 
                text="Visit Us" 
                subtext="Noida, Uttar Pradesh, India" 
              />
              <ContactInfoItem 
                icon={Phone} 
                text="Call Us" 
                subtext="Mon-Fri from 9am to 6pm" 
              />
            </div>
          </div>

          {/* Bottom Content */}
          <div className="relative z-10 mt-12 pt-8 border-t border-white/20">
            <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-semibold drop-shadow-sm">
              © 2024 Aerosphere Aviation Business Solutions
            </p>
          </div>
        </div>

        {/* RIGHT PANEL: Form (Takes 3 columns) */}
        <div className="lg:col-span-3 p-8 lg:p-12 flex flex-col justify-center bg-transparent">
          
          <div className="max-w-lg mx-auto w-full">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 drop-shadow-md">
                <MessageSquare className="text-indigo-400" size={24} /> 
                Send us a message
              </h2>
              <p className="text-indigo-100/80 mt-2 text-sm drop-shadow-sm">
                We typically reply within 24 hours.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InputField 
                  label="Full Name" 
                  name="name"
                  icon={User} 
                  placeholder="John Doe" 
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
                <InputField 
                  label="Email Address" 
                  name="email"
                  icon={Mail} 
                  type="email"
                  placeholder="john@company.com" 
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <InputField 
                label="Subject" 
                name="subject"
                icon={Type} 
                placeholder="Briefly describe your inquiry..." 
                value={formData.subject}
                onChange={handleInputChange}
                required
              />

              <InputField 
                label="Message" 
                name="message"
                icon={MessageSquare} 
                placeholder="Tell us how we can help..." 
                value={formData.message}
                onChange={handleInputChange}
                multiline
                required
              />

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3.5 px-6 border border-white/20 rounded-xl shadow-lg text-sm font-bold text-white bg-indigo-600/80 hover:bg-indigo-600 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 backdrop-blur-md"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Sending Message...
                    </>
                  ) : (
                    <>
                      Send Message 
                      <Send className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

      </motion.div>

      <ToastContainer position="bottom-right" theme="colored" />
    </div>
  );
}