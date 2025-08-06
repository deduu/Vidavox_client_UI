import React, { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { useNavigate } from "react-router-dom";
import { sendPasswordReset } from "../services/api";

const USE_CAPTCHA = false; // 🧩 Toggle CAPTCHA integration

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null); // success | error | null
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      await sendPasswordReset(email);
      setStatus("success");
      setTimeout(() => {
        navigate("/"); // ✅ Redirect after success
      }, 2500);
    } catch (err) {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md border">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/vidavox_white.png"
            alt="Company Logo"
            className="max-h-20 w-auto"
          />
        </div>

        <h2 className="text-center text-2xl font-bold">Reset your password</h2>
        <p className="text-center text-sm text-gray-600 mt-1 mb-6">
          Enter your verified email address and we'll send you a reset link.
        </p>

        {/* SUCCESS STATE */}
        {status === "success" ? (
          <div className="text-center px-4 py-6 rounded border border-green-300 bg-green-50 text-green-700 animate-fade-in">
            <div className="text-5xl mb-2">✅</div>
            <p className="font-semibold">Reset email sent successfully!</p>
            <p className="text-sm text-gray-600">Check your inbox.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Email Input */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full border rounded px-3 py-2 mb-4 focus:outline-none focus:ring focus:border-blue-400"
            />

            {/* CAPTCHA (Optional) */}
            {USE_CAPTCHA && (
              <div className="mb-4">
                {/* Replace with <ReCAPTCHA /> from react-google-recaptcha */}
                <div className="w-full h-24 border flex items-center justify-center text-gray-400 rounded border-dashed">
                  <ReCAPTCHA
                    sitekey="your_site_key_here"
                    onChange={onCaptchaChange}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded transition ${
                loading && "opacity-50"
              }`}
            >
              {loading ? "Sending..." : "Send password reset email"}
            </button>

            {/* Error Feedback */}
            {status === "error" && (
              <p className="text-sm text-red-600 mt-3 text-center">
                ❌ Failed to send reset email. Try again.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
