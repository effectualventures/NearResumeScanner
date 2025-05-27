import express, { type Request, Response, NextFunction } from "express";
import { registerV2Routes } from "./routes-v2";
import fileUpload from "express-fileupload";
import path from "path";
import { createServer } from "http";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  abortOnLimit: true,
  createParentPath: true,
  useTempFiles: false
}));

// Simple logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      console.log(`${new Date().toLocaleTimeString()} [express] ${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

const server = createServer(app);

// Register API routes
registerV2Routes(app);
console.log("Enhanced v2 routes registered");

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  console.error(err);
});

// In development, serve the frontend through Vite proxy
if (process.env.NODE_ENV === "development") {
  // Proxy frontend requests to Vite dev server
  app.get("*", async (req, res) => {
    try {
      const response = await fetch(`http://localhost:5173${req.path}`);
      const html = await response.text();
      res.send(html);
    } catch (error) {
      res.status(500).send(`
        <html>
          <body>
            <h1>Resume Application Loading...</h1>
            <p>Frontend development server starting up. Please wait a moment and refresh.</p>
            <script>setTimeout(() => window.location.reload(), 3000);</script>
          </body>
        </html>
      `);
    }
  });
} else {
  // Serve static files from client/dist in production
  app.use(express.static(path.join(__dirname, "../client/dist")));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });
}

// Start server
const port = 5000;
server.listen({
  port,
  host: "0.0.0.0",
  reusePort: true,
}, () => {
  console.log(`${new Date().toLocaleTimeString()} [express] serving on port ${port}`);
});