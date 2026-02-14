import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom"; // Import createPortal
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, ShieldCheck } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// --- UTILITIES ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- COMPONENTS ---

// 1. The Trigger Link/Button
const TermsTrigger = ({ onClick }) => (
  <button
    onClick={onClick}
    className="group relative inline-flex items-center gap-2 text-xs text-indigo-200 hover:text-white transition-colors cursor-pointer drop-shadow-sm"
  >
    <FileText size={14} className="opacity-70 group-hover:opacity-100 transition-opacity" />
    <span className="relative font-medium">
      Terms & Conditions
      <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-white transition-all group-hover:w-full"></span>
    </span>
  </button>
);

// 2. Section Heading Helper
const SectionTitle = ({ children }) => (
  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mt-6 mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">
    {children}
  </h3>
);

// 3. Paragraph Helper
const Text = ({ children, className }) => (
  <p className={cn("text-xs leading-relaxed text-slate-600 dark:text-slate-300 mb-3 text-justify", className)}>
    {children}
  </p>
);

// --- MAIN COMPONENT ---

export default function TermsAndConditionsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef(null);

  // Close on Escape key
  
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  return (
    <>
      <TermsTrigger onClick={() => setIsOpen(true)} />

      {/* Render modal in a Portal attached to document.body to escape parent transforms */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 font-sans">
              
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              >
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                      <ShieldCheck className="text-indigo-600 dark:text-indigo-400" size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-none">
                        Terms of Service
                      </h2>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Last Updated: August 23, 2023
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div ref={contentRef} className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-slate-50/30 dark:bg-slate-950/30">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-lg mb-6">
                      <Text className="text-indigo-900 dark:text-indigo-200 font-medium mb-0 text-left">
                        PLEASE READ THIS TERMS OF SERVICE AGREEMENT CAREFULLY. BY USING THIS WEBSITE OR DOWNLOADING INFORMATION FROM THIS WEBSITE YOU AGREE TO BE BOUND BY ALL OF THE TERMS AND CONDITIONS OF THIS AGREEMENT.
                      </Text>
                    </div>

                    <Text>
                      This Terms of Service Agreement (the "Agreement") governs your use of this website, <strong>www.airlineplan.com</strong> (the "Website"), Aerosphere Aviation Business Solutions Private Limited ("AABS") offer of business information for purchase on this Website, or your purchase of business information available on this Website. This Agreement includes, and incorporates by this reference, the policies and guidelines referenced below.
                    </Text>
                    <Text>
                      AABS reserves the right to change or revise the terms and conditions of this Agreement at any time by posting any changes or a revised Agreement on this Website. AABS will alert you that changes or revisions have been made by indicating on the top of this Agreement the date it was last revised. The changed or revised Agreement will be effective immediately after it is posted on this Website.
                    </Text>

                    <SectionTitle>I. Business Information</SectionTitle>
                    <Text>
                      <strong>Terms of Offer:</strong> This Website offers for sale certain Business Information (the "Products"). By registering your account on this Website, you agree to the terms set forth in this Agreement.
                    </Text>
                    <Text>
                      <strong>Customer Solicitation:</strong> Unless you notify AABS, while being contacted, of your desire to opt out from further direct company communications and solicitations, you are agreeing to continue to receive further emails and call solicitations by AABS.
                    </Text>
                    <Text>
                      <strong>Opt Out Procedure:</strong> To opt out of all future solicitations you may send a written remove request to <strong>admin@airlineplan.com</strong>.
                    </Text>
                    <Text>
                      <strong>Proprietary Rights:</strong> AABS has rights to all trademarks and copyright on specific layouts of all the web pages, including calls to action, text placement, images and other information in www.airlineplan.com.
                    </Text>

                    <SectionTitle>II. Website Usage</SectionTitle>
                    <Text>
                      <strong>Content:</strong> AABS does not always create the information offered on this Website; instead the information is based on inputs from the user(s) of this Website. To the extent that AABS does create the content on this Website, such content is protected by intellectual property laws of the India, foreign nations, and international bodies.
                    </Text>
                    <Text>
                      <strong>User Data:</strong> All data directly entered by a user is the sole property of that particular user. AABS shall not access, disseminate or use any such user related data unless written authorization for access is provided.
                    </Text>
                    <Text>
                      <strong>Use of Website:</strong> AABS is not responsible for any damages resulting from use of this website. You will not use the Website for illegal purposes. You will abide by all applicable laws and regulations in your use of the Website.
                    </Text>
                    <Text>
                      <strong>License:</strong> By using this Website, you are granted a limited, non-exclusive, non-transferable right to use the content and materials on the Website in connection with your normal use of the Website.
                    </Text>

                    <SectionTitle>III. Disclaimer of Warranties</SectionTitle>
                    <Text>
                      Your use of this Website and/or the Products are at your sole risk. AABS expressly disclaims all warranties of any kind, whether express or implied. AABS makes no warranty that the information provided on this Website is accurate, reliable, complete or timely.
                    </Text>

                    <SectionTitle>IV. Limitation of Liability</SectionTitle>
                    <Text>
                      AABS’ entire liability, and your exclusive remedy, in law, in equity, or otherwise, with respect to the website content and products and/or for any breach of this agreement is zero/nil.
                    </Text>

                    <SectionTitle>V. Indemnification</SectionTitle>
                    <Text>
                      You will release, indemnify, defend and hold harmless AABS, and any of its contractors, employees, officers, directors, shareholders, affiliates and assigns from all liabilities, claims, damages, costs and expenses relating to your use of the Website content or Products.
                    </Text>

                    <SectionTitle>VI. Agreement to be Bound</SectionTitle>
                    <Text>
                      By using this Website or Products, you acknowledge that you have read and agree to be bound by this Agreement and all terms and conditions on this Website.
                    </Text>

                    <SectionTitle>VIII. General</SectionTitle>
                    <ul className="list-disc pl-5 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                      <li><strong>Force Majeure:</strong> AABS will not be deemed in default hereunder due to earthquake, flood, fire, storm, natural disaster, act of God, war, terrorism, etc.</li>
                      <li><strong>Cessation of Operation:</strong> AABS may at any time cease operation of the Website and availability of the Products.</li>
                      <li><strong>Governing Law:</strong> This Website originates from Noida, Uttar Pradesh, India. This Agreement will be governed by the laws of India.</li>
                      <li><strong>Statute of Limitation:</strong> Any claim or cause of action arising out of or related to use of the Website must be filed within six (6) months.</li>
                      <li><strong>Termination:</strong> AABS reserves the right to terminate your access to the Website if it reasonably believes that you have breached any of the terms and conditions.</li>
                    </ul>
                    
                    <div className="mt-8 p-4 text-center border-t border-slate-200 dark:border-slate-800">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                        Aerosphere Aviation Business Solutions Pvt. Ltd.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer / Actions */}
                <div className="p-4 md:p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    I Understand & Agree
                  </button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}