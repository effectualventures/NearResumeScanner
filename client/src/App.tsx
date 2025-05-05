import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import FeedbackAutomation from "@/pages/FeedbackAutomation";
import AutomatedFeedback from "@/pages/AutomatedFeedback";

// Simple navigation bar
function Navbar() {
  return (
    <nav className="bg-near-navy text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-xl font-bold">Near Resume Engine</div>
        <div className="space-x-6">
          <Link href="/" className="hover:underline">Home</Link>
          <Link href="/feedback" className="hover:underline">Feedback Tool</Link>
          <Link href="/auto-feedback" className="hover:underline">Auto Feedback</Link>
        </div>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow">
        <Switch>
          <Route path="/" component={Home}/>
          <Route path="/feedback" component={FeedbackAutomation}/>
          <Route path="/auto-feedback" component={AutomatedFeedback}/>
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
