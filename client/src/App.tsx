import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import Home from "@/pages/Home";
import AutomatedFeedback from "@/pages/AutomatedFeedback";
import FeedbackAutomation from "@/pages/FeedbackAutomation";

// Simple navigation bar
function Navbar() {
  return (
    <nav className="bg-near-navy text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-xl font-bold">Near Resume Engine</div>
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
          <Route path="/feedback" component={AutomatedFeedback}/>
          <Route path="/automation" component={FeedbackAutomation}/>
          <Route component={() => <div>Page not found</div>} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}

export default App;
