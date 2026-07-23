import { defineConfig, devices } from "@playwright/test";
const localBrowser=process.env.CI?{}:{channel:"chrome" as const};
export default defineConfig({testDir:"./e2e",fullyParallel:true,retries:process.env.CI?2:0,reporter:process.env.CI?"github":"list",use:{baseURL:"http://127.0.0.1:3000",trace:"on-first-retry"},webServer:{command:"npm run dev",url:"http://127.0.0.1:3000",reuseExistingServer:!process.env.CI,env:{DEMO_MODE:"true"}},projects:[{name:"chromium",use:{...devices["Desktop Chrome"],...localBrowser}},{name:"mobile",use:{...devices["Pixel 7"],...localBrowser}}]});
