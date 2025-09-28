// Landing page for unauthenticated users
// Local authentication system

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Landing() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const endpoint = isLoginMode ? "/api/login" : "/api/register";
      await apiRequest("POST", endpoint, { email, password });

      // Redirect to app on successful login/register
      window.location.href = "/app";
    } catch (error) {
      toast({
        title: "Error",
        description: isLoginMode ? "Invalid credentials" : "Registration failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            AI Assistant Studio
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-8">
            Your comprehensive AI development companion with local LLM integration, 
            web search capabilities, and intelligent project management tools.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <i className="fas fa-robot text-purple-400"></i>
                Local LLM Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-300">
                Connect to Ollama and other local language models for private, fast AI assistance.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <i className="fas fa-search text-blue-400"></i>
                Web Search & Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-300">
                Intelligent web search with multi-provider support and AI-powered content analysis.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <i className="fas fa-code text-green-400"></i>
                Project Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-300">
                Advanced project planning, GitHub integration, and intelligent code analysis tools.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-800/50 border-slate-700 max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-white text-2xl">
              {isLoginMode ? "Sign In" : "Create Account"}
            </CardTitle>
            <CardDescription className="text-slate-300">
              {isLoginMode 
                ? "Welcome back! Please sign in to continue."
                : "Create a new account to get started."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@localhost"
                  required
                  className="bg-slate-700 border-slate-600 text-white"
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isLoginMode ? "Enter your password" : "Create a password"}
                  required
                  className="bg-slate-700 border-slate-600 text-white"
                  data-testid="input-password"
                />
              </div>
              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                data-testid="button-submit"
              >
                {isLoading ? "Processing..." : (isLoginMode ? "Sign In" : "Create Account")}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <Button
                variant="link"
                onClick={() => setIsLoginMode(!isLoginMode)}
                className="text-purple-400 hover:text-purple-300"
                data-testid="button-toggle-mode"
              >
                {isLoginMode 
                  ? "Need an account? Sign up" 
                  : "Already have an account? Sign in"
                }
              </Button>
            </div>

            {isLoginMode && (
              <div className="mt-4 p-3 bg-slate-700/50 rounded-md">
                <p className="text-xs text-slate-300">
                  <strong>Default Admin Credentials:</strong><br/>
                  Email: admin@localhost<br/>
                  Password: admin123
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}