import { expect, test } from "@playwright/test";

test("customer can discover a tailor and begin a request",async({page})=>{await page.goto("/");await expect(page.getByRole("heading",{name:/Made for you/i})).toBeVisible();await page.getByRole("link",{name:"Find your tailor"}).click();await expect(page.getByRole("heading",{name:/right hands/i})).toBeVisible();await page.getByPlaceholder("Search by name, style or location").fill("Kola");await page.getByRole("link",{name:/Kola & Sons portfolio/i}).click();await expect(page.getByRole("heading",{name:"Kola & Sons",exact:true})).toBeVisible();await page.getByRole("link",{name:"Request a quote"}).click();await expect(page.getByRole("heading",{name:"What are we making?"})).toBeVisible()});

test("payment UI discloses exact NGN and estimated USD",async({page})=>{await page.goto("/customer/payments?demo=1");await expect(page.getByText(/exact NGN/i).first()).toBeVisible();await expect(page.getByText(/est\. · exact ₦/i).first()).toBeVisible()});

test("homepage has no horizontal overflow on mobile",async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto("/");const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewportWidth:window.innerWidth}));expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.viewportWidth)});
