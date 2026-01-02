import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getApiKeys, updateApiKeys } from "../services/api";
import {
  Key,
  Save,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";

export default function ProfileSettingsPage() {
  const [keys, setKeys] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showKeys, setShowKeys] = useState({});
  const [errors, setErrors] = useState({});
  const [maskedKeys, setMaskedKeys] = useState({});

  const providerConfigs = {
    OPENAI_API_KEY: {
      name: "OpenAI",
      icon: "/openai-icon.png",
      placeholder: "sk-...",
      description: "Used for GPT-4o, GPT-3.5, etc.",
    },
    GEMINI_API_KEY: {
      name: "Google AI (Gemini)",
      icon: "/Google_Gemini_icon_2025.png",
      placeholder: "AIza...",
      description: "Used for Gemini Pro, Gemini Flash, etc.",
    },
  };

  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Profile Settings – Agentic AI";
  }, []);

  useEffect(() => {
    getApiKeys().then((loaded) => {
      const masked = {};
      for (const [key, val] of Object.entries(loaded)) {
        if (val) masked[key] = true;
      }
      setKeys(loaded); // ✅ keys = { GEMINI_API_KEY: "...", OPENAI_API_KEY: "..." }
      setMaskedKeys(masked);
    });
  }, []);

  const handleChange = (providerId, value) => {
    setKeys((prev) => ({ ...prev, [providerId]: value }));

    // Clear the masked state when user starts typing
    if (maskedKeys[providerId]) {
      setMaskedKeys((prev) => ({ ...prev, [providerId]: false }));
    }

    if (errors[providerId]) {
      setErrors((prev) => ({ ...prev, [providerId]: null }));
    }
    if (saveSuccess) setSaveSuccess(false);
  };
  const toggleKeyVisibility = (providerId) => {
    setShowKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const validateKeys = () => {
    const newErrors = {};
    Object.entries(keys).forEach(([provider, key]) => {
      if (key && key.trim()) {
        if (provider === "OPENAI_API_KEY" && !key.startsWith("sk-")) {
          newErrors[provider] = "OpenAI API keys typically start with 'sk-'";
        }
        if (provider === "GEMINI_API_KEY" && !key.startsWith("AIza")) {
          newErrors[provider] = "Google keys typically start with 'AIza'";
        }
        if (key.length < 20) {
          newErrors[provider] = "API key seems too short";
        }
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateKeys()) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      await updateApiKeys(keys);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save API keys:", error);
      setErrors({ general: "Failed to save API keys. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const hasUnsavedChanges = () =>
    Object.keys(keys).some((key) => keys[key] && keys[key].trim());

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center text-sm text-blue-600 hover:underline"
        >
          ← Back
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Key className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              API Configuration
            </h1>
          </div>
          <p className="text-gray-600">
            Configure your API keys to enable AI model integrations. Your keys
            are stored securely and never shared.
          </p>
        </div>

        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-red-700">{errors.general}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="text-green-700">API keys saved successfully!</span>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">API Keys</h2>

          <div className="space-y-6">
            {Object.entries(providerConfigs).map(([providerId, config]) => (
              <div key={providerId} className="space-y-2">
                <div className="flex items-center space-x-3">
                  {config.icon.startsWith("/") ? (
                    <img
                      src={config.icon}
                      alt={config.name}
                      className="w-5 h-5"
                    />
                  ) : (
                    <span className="text-lg">{config.icon}</span>
                  )}

                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-900">
                      {config.name}
                    </label>
                    <p className="text-xs text-gray-500">
                      {config.description}
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={showKeys[providerId] ? "text" : "password"}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors[providerId]
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                    value={
                      maskedKeys[providerId] && !showKeys[providerId]
                        ? "••••••••••••••••"
                        : keys[providerId] || ""
                    }
                    autoComplete="new-password"
                    onChange={(e) => handleChange(providerId, e.target.value)}
                    placeholder={`Enter your ${config.name} API key (${config.placeholder})`}
                  />
                  <button
                    type="button"
                    onClick={() => toggleKeyVisibility(providerId)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                    title={
                      showKeys[providerId] ? "Hide API key" : "Show API key"
                    }
                  >
                    {showKeys[providerId] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors[providerId] && (
                  <div className="flex items-center space-x-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errors[providerId]}</span>
                  </div>
                )}

                {keys[providerId] &&
                  !errors[providerId] &&
                  keys[providerId].length > 20 && (
                    <div className="flex items-center space-x-2 text-green-600 text-sm">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>API key format looks good</span>
                    </div>
                  )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              {hasUnsavedChanges()
                ? "You have unsaved changes"
                : "All changes saved"}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  setKeys({});
                  setErrors({});
                  setSaveSuccess(false);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={saving}
              >
                Clear All
              </button>

              <button
                onClick={handleSave}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all ${
                  saving
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                } text-white`}
                disabled={saving || Object.keys(errors).length > 0}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Keys</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Security Notice</p>
              <p>
                Your API keys are encrypted and stored securely. They are only
                used to make requests to the respective AI services on your
                behalf. Never share your API keys with others.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
