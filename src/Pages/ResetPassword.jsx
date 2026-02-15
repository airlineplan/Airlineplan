import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Key,
  Lock,
  CheckCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-toastify";

/* ---------------- INPUT FIELD ---------------- */

const InputField = ({ label, icon: Icon, type = "text", error, ...props }) => (
  <div className="space-y-1.5 text-left">
    <label className="text-xs font-bold text-indigo-100/80 uppercase tracking-wider ml-1 drop-shadow-sm">
      {label}
    </label>

    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-300/50 group-focus-within:text-indigo-400 transition-colors">
        <Icon size={18} />
      </div>

      <input
        type={type}
        className={`block w-full pl-10 pr-3 py-3 bg-slate-950/40 border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-slate-950/60 transition-all placeholder:text-white/20 backdrop-blur-sm shadow-inner ${
          error
            ? "border-red-500/50 focus:border-red-500"
            : "border-white/10 focus:border-indigo-500/50"
        }`}
        {...props}
      />
    </div>

    {error && (
      <motion.p
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs text-red-400 ml-1 font-medium"
      >
        {error}
      </motion.p>
    )}
  </div>
);

/* ---------------- MAIN COMPONENT ---------------- */

const ResetPassword = (props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [inputField, setInputField] = useState({
    otpCode: "",
    password: "",
    cpassword: "",
  });

  const [errField, setErrField] = useState({
    otpCodeErr: "",
    passwordErr: "",
    cpasswordErr: "",
  });

  const validateForm = () => {
    let isValid = true;
    const errors = { otpCodeErr: "", passwordErr: "", cpasswordErr: "" };

    if (!inputField.otpCode) {
      isValid = false;
      errors.otpCodeErr = "Please enter the OTP sent to your email";
    }

    if (!inputField.password) {
      isValid = false;
      errors.passwordErr = "Please enter a new password";
    }

    if (!inputField.cpassword) {
      isValid = false;
      errors.cpasswordErr = "Please confirm your password";
    } else if (inputField.password !== inputField.cpassword) {
      isValid = false;
      errors.cpasswordErr = "Passwords do not match";
    }

    setErrField(errors);
    return isValid;
  };

  const inputHandler = (e) => {
    setInputField({ ...inputField, [e.target.name]: e.target.value });
    if (errField[`${e.target.name}Err`]) {
      setErrField({ ...errField, [`${e.target.name}Err`]: "" });
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setLoading(true);
    const payload = { ...inputField, ...props };

    try {
      const response = await axios.post(
        "https://airlinebackend-zfsg.onrender.com/change-passowrd",
        payload
      );

      if (response.data.statusText === "Success") {
        toast.success(response.data.message);
        setTimeout(() => navigate("/"), 1500);
      } else {
        toast.error(response.data.error || "Failed to reset password");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center">

      {/* Header Icon */}
      <div className="mx-auto mb-6 w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
        <ShieldCheck className="text-indigo-300" size={32} />
      </div>

      <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-md">
        Set New Password
      </h2>
      <p className="text-indigo-200/70 text-sm mb-8">
        Enter the OTP code and your new password below.
      </p>

      <div className="space-y-5">
        <InputField
          label="OTP Code"
          name="otpCode"
          icon={Key}
          value={inputField.otpCode}
          onChange={inputHandler}
          error={errField.otpCodeErr}
          autoFocus
        />

        <InputField
          label="New Password"
          name="password"
          type="password"
          icon={Lock}
          value={inputField.password}
          onChange={inputHandler}
          error={errField.passwordErr}
        />

        <InputField
          label="Confirm Password"
          name="cpassword"
          type="password"
          icon={CheckCircle}
          value={inputField.cpassword}
          onChange={inputHandler}
          error={errField.cpasswordErr}
        />

        <div className="pt-4 space-y-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2 inline" />
                Updating Password…
              </>
            ) : (
              "Change Password"
            )}
          </button>

          <button
            onClick={() => navigate("/")}
            className="w-full inline-flex justify-center items-center text-sm font-medium text-indigo-300 hover:text-white py-2"
          >
            <ArrowLeft size={16} className="mr-2" /> Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
