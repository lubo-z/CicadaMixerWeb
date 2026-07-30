import {expect, test} from "@playwright/test";

test.beforeEach(async ({page}) => {
  await page.goto("/");
});

test("manual mixing keeps candidate and active selections separate", async ({
  page,
}) => {
  await page.evaluate(() => {
    HTMLMediaElement.prototype.play = async () => undefined;
    HTMLMediaElement.prototype.pause = () => undefined;
    HTMLMediaElement.prototype.load = () => undefined;
  });
  await expect(page).toHaveTitle(/CicadaMixer/);
  await expect(page.getByRole("heading", {name: "选择蝉鸣"})).toBeVisible();
  await expect(page.locator(".cicada-card")).toHaveCount(17);

  await page.getByRole("button", {name: "播放"}).click();
  await expect(page.getByText("请至少选择一种蝉")).toBeVisible();

  const checkboxes = page.locator(".cicada-card input[type=checkbox]");
  await checkboxes.nth(0).check();
  await checkboxes.nth(1).check();
  await page.getByRole("button", {name: "播放"}).click();
  await expect(page.getByText("正在播放 2 种蝉")).toBeVisible();

  await page.getByRole("button", {name: "清空已选"}).click();
  await expect(checkboxes.nth(0)).not.toBeChecked();
  await expect(checkboxes.nth(1)).not.toBeChecked();
  await expect(page.getByText("正在播放 2 种蝉")).toBeVisible();
  await expect(page.getByText("选择已更改，点击播放以应用")).toBeVisible();

  await checkboxes.nth(1).check();
  await page.getByRole("button", {name: "应用并播放"}).click();
  await expect(page.getByText("正在播放 1 种蝉")).toBeVisible();
});

test("automatic mode is read-only and exposes seasonal controls", async ({
  page,
}) => {
  await page.getByRole("button", {name: "时节自动"}).click();
  await expect(
    page.getByRole("heading", {name: "自动组合预览"}),
  ).toBeVisible();
  await page.getByLabel("时节").selectOption("summer");
  await page.getByLabel("每日时段").selectOption("dawn");

  const checked = page.locator(
    ".cicada-card input[type=checkbox]:checked",
  );
  expect(await checked.count()).toBeGreaterThan(0);
  await expect(checked.first()).toBeDisabled();
});

test("browser preferences persist after reload", async ({page}) => {
  await page.getByRole("button", {name: "时节自动"}).click();
  await page.getByLabel("自动混音上限").selectOption("3");
  await page.getByLabel("实时检查间隔").selectOption("45");
  await page.reload();
  await page.getByRole("button", {name: "时节自动"}).click();
  await expect(page.getByLabel("自动混音上限")).toHaveValue("3");
  await expect(page.getByLabel("实时检查间隔")).toHaveValue("45");
});

test("a production MP4 starts in a real Chromium media element", async ({
  page,
}) => {
  const firstCheckbox = page.locator(
    ".cicada-card input[type=checkbox]",
  ).first();
  await firstCheckbox.check();
  await page.getByRole("button", {name: "播放"}).click();
  await expect(page.getByText("正在播放 1 种蝉")).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", {name: "停止"}).click();
  await expect(page.getByText("已停止")).toBeVisible();
});

test("catalog and media endpoint are available in the browser session", async ({
  request,
}) => {
  const catalogResponse = await request.get("/api/v1/catalog");
  expect(catalogResponse.ok()).toBeTruthy();
  const catalog = await catalogResponse.json();
  expect(catalog.cicadas).toHaveLength(17);

  const mediaResponse = await request.get(catalog.cicadas[0].media.url, {
    headers: {Range: "bytes=0-99"},
  });
  expect(mediaResponse.status()).toBe(206);
  expect((await mediaResponse.body()).byteLength).toBe(100);
});

test("page footer lists referenced calling-period sources", async ({
  page,
  request,
}) => {
  const catalog = await (await request.get("/api/v1/catalog")).json();
  const expectedIds = new Set<string>(
    catalog.cicadas
      .filter((cicada: {callingWindows: string[]}) =>
        cicada.callingWindows.length > 0)
      .flatMap((cicada: {sourceIds: string[]}) => cicada.sourceIds),
  );

  const footer = page.getByRole("contentinfo");
  await expect(
    footer.getByRole("heading", {name: "蝉鸣时段信息来源"}),
  ).toBeVisible();
  await expect(footer.getByRole("link")).toHaveCount(expectedIds.size);
  await expect(footer.getByRole("link").first()).toHaveAttribute(
    "target",
    "_blank",
  );
  await expect(footer.getByRole("link").first()).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );
});
