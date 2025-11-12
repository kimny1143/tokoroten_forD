import { Toaster } from "sonner";

function App() {
  return (
    <div className="bg-gradient-to-br from-primary-dark to-secondary-dark min-h-screen">
      <div className="backdrop-blur-sm bg-background/95 min-h-screen">
        // ... existing code ...
      </div>
      <Toaster />
    </div>
  );
}

export default App; 