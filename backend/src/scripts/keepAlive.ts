import "dotenv/config";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";
const HEALTH_URL = `${BACKEND_URL}/api/health`;
const INTERVAL = 5 * 60 * 1000;

async function keepAlive() {
  try {
    const response = await fetch(HEALTH_URL);

    if (response.ok) {
      console.log(
        `[Keep Alive] Backend is awake - ${new Date().toISOString()}`,
      );
    } else {
      console.error(`[Keep Alive] Backend returned ${response.status}`);
    }
  } catch (error) {
    console.error("[Keep Alive] Failed to reach backend:", error);
  }
}

keepAlive();
setInterval(keepAlive, INTERVAL);
