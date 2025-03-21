import { useState, useEffect } from "react";
import { z } from "zod";
import { api } from "~/utils/api";
import { saveEmailConfig, getEmailConfig } from "~/utils/emailStorage";
import type { EmailConfig } from "~/utils/imap";

const emailConfigSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.number().int().positive().default(993),
  user: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  tls: z.boolean().default(true),
});

export default function EmailConfigForm() {
  const [config, setConfig] = useState<EmailConfig>({
    host: "",
    port: 993,
    user: "",
    password: "",
    tls: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testMessage, setTestMessage] = useState("");

  const testConnection = api.email.testConnection.useMutation({
    onSuccess: () => {
      setTestMessage("Connection successful!");
      saveEmailConfig(config);
      setIsConfigured(true);
    },
    onError: (error) => {
      setTestMessage(`Connection failed: ${error.message}`);
    },
  });

  useEffect(() => {
    const savedConfig = getEmailConfig();
    if (savedConfig) {
      setConfig(savedConfig);
      setIsConfigured(true);
    }
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === "checkbox") {
      const target = e.target as HTMLInputElement;
      setConfig((prev) => ({
        ...prev,
        [name]: target.checked,
      }));
    } else if (name === "port") {
      setConfig((prev) => ({
        ...prev,
        [name]: parseInt(value) || 0,
      }));
    } else {
      setConfig((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const validateForm = () => {
    try {
      emailConfigSchema.parse(config);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestMessage("");
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      await testConnection.mutateAsync(config);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
      <h2 className="mb-4 text-xl font-bold text-gray-800 dark:text-white">
        Email Configuration
      </h2>
      
      {isConfigured && (
        <div className="mb-4 rounded-md bg-green-100 p-3 text-green-800 dark:bg-green-800/20 dark:text-green-400">
          <p>Email account configured</p>
          <button
            onClick={() => setIsConfigured(false)}
            className="mt-2 text-sm font-medium text-green-700 underline dark:text-green-400"
          >
            Edit configuration
          </button>
        </div>
      )}
      
      {!isConfigured && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="host"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              IMAP Server
            </label>
            <input
              type="text"
              id="host"
              name="host"
              value={config.host}
              onChange={handleInputChange}
              placeholder="imap.example.com"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            {errors.host && (
              <p className="mt-1 text-sm text-red-600">{errors.host}</p>
            )}
          </div>
          
          <div>
            <label
              htmlFor="port"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Port
            </label>
            <input
              type="number"
              id="port"
              name="port"
              value={config.port}
              onChange={handleInputChange}
              placeholder="993"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            {errors.port && (
              <p className="mt-1 text-sm text-red-600">{errors.port}</p>
            )}
          </div>
          
          <div>
            <label
              htmlFor="user"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email Address
            </label>
            <input
              type="email"
              id="user"
              name="user"
              value={config.user}
              onChange={handleInputChange}
              placeholder="user@example.com"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            {errors.user && (
              <p className="mt-1 text-sm text-red-600">{errors.user}</p>
            )}
          </div>
          
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={config.password}
              onChange={handleInputChange}
              placeholder="••••••••"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="tls"
              name="tls"
              checked={config.tls}
              onChange={handleInputChange}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
            />
            <label
              htmlFor="tls"
              className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Use TLS
            </label>
          </div>
          
          {testMessage && (
            <div
              className={`mt-4 rounded-md p-3 ${
                testMessage.includes("failed")
                  ? "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
                  : "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
              }`}
            >
              {testMessage}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {isLoading ? "Testing Connection..." : "Test Connection & Save"}
          </button>
        </form>
      )}
    </div>
  );
} 