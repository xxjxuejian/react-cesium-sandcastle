import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "@/app/App";

async function bootstrap() {
  if (import.meta.env.PROD && import.meta.env.VITE_USE_MOCK === "true") {
    const { setupProdMockServer } = await import("./mockProdServer");
    await setupProdMockServer();
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

bootstrap();
