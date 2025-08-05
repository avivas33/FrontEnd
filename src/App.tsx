import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import InvoiceList from "./pages/InvoiceList";
import InvoiceDetails from "./pages/InvoiceDetails";
import PaymentConfirmation from "./pages/PaymentConfirmation";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";
import PWAInstallPrompt from "./components/PWAInstallPrompt";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <BrowserRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/index" element={<Index />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/invoice-list" element={<InvoiceList />} />
          <Route path="/invoice-list/:clientCode" element={<InvoiceList />} />
          <Route path="/invoice-details" element={<InvoiceDetails />} />
          <Route path="/invoice-details/:invoiceNumber" element={<InvoiceDetails />} />
          <Route path="/payment-confirmation" element={<PaymentConfirmation />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
