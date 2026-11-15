/**
 * Scriptable (iPhone) widget script. The app fills in your private widget URL
 * when you tap "Copy widget script" in Settings.
 * Works as a home-screen widget (small/medium) and a lock-screen widget
 * (rectangular or inline).
 */
export function scriptableWidget(url: string, appUrl?: string): string {
  return `// LC Daily widget for Scriptable — https://scriptable.app
// Shows today's 2 topics and your streak. Refreshes every ~30 minutes.
const URL_ = ${JSON.stringify(url)};
const APP_URL = ${JSON.stringify(appUrl ?? '')};

const fm = FileManager.local();
const cachePath = fm.joinPath(fm.documentsDirectory(), "lc-daily-widget.json");

async function load() {
  try {
    const r = new Request(URL_);
    r.timeoutInterval = 10;
    const data = await r.loadJSON();
    if (data && data.topics) { fm.writeString(cachePath, JSON.stringify(data)); return data; }
  } catch (e) {}
  return fm.fileExists(cachePath) ? JSON.parse(fm.readString(cachePath)) : null;
}

const data = await load();
const family = config.widgetFamily || "medium";
const w = new ListWidget();
w.url = APP_URL || URL_.replace(/\\/api\\/widget\\/.*/, "/");
w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);

const streak = data ? (data.streak > 0 ? "🔥 " + data.streak : "🌱 0") : "LC";
const topics = data ? data.topics : [];
const when = data && !data.isToday ? "Monday" : "Today";

if (family === "accessoryInline") {
  const t = w.addText(streak + " · " + (topics.map(x => x.subjectName).join(" + ") || "LC Daily"));
} else if (family === "accessoryRectangular") {
  const head = w.addText(streak + " · " + when);
  head.font = Font.boldSystemFont(12);
  for (const t of topics) {
    const line = w.addText((t.done ? "✓ " : "") + t.label);
    line.font = Font.systemFont(11);
    line.lineLimit = 1;
  }
} else if (family === "accessoryCircular") {
  const s = w.addText(streak);
  s.font = Font.boldSystemFont(14);
  s.centerAlignText();
} else {
  w.backgroundColor = Color.dynamic(new Color("#f8fafc"), new Color("#0f172a"));
  w.setPadding(12, 14, 12, 14);
  const top = w.addStack();
  const h = top.addText(when + "'s topics");
  h.font = Font.semiboldSystemFont(12);
  h.textColor = Color.gray();
  top.addSpacer();
  const s = top.addText(streak);
  s.font = Font.boldSystemFont(13);
  w.addSpacer(6);
  if (!topics.length) {
    const t = w.addText(data ? "Open LC Daily to plan today." : "Couldn't load. Check the URL.");
    t.font = Font.systemFont(13);
  }
  for (const t of topics) {
    const row = w.addStack();
    row.layoutHorizontally();
    const bar = row.addStack();
    bar.size = new Size(4, family === "small" ? 34 : 38);
    bar.backgroundColor = new Color(t.color);
    bar.cornerRadius = 2;
    row.addSpacer(6);
    const col = row.addStack();
    col.layoutVertically();
    const sub = col.addText(t.subjectName + (t.done ? " ✓" : ""));
    sub.font = Font.semiboldSystemFont(10);
    sub.textColor = new Color(t.color);
    const lab = col.addText(t.label);
    lab.font = Font.boldSystemFont(family === "small" ? 11 : 13);
    lab.lineLimit = 2;
    lab.minimumScaleFactor = 0.7;
    w.addSpacer(6);
  }
  if (data && data.nextDeadline && family !== "small") {
    w.addSpacer();
    const d = w.addText("⏳ " + data.nextDeadline.name + " · " + data.nextDeadline.days + " days");
    d.font = Font.systemFont(10);
    d.textColor = Color.gray();
    d.lineLimit = 1;
  }
}

if (config.runsInWidget) Script.setWidget(w);
else await w.presentMedium();
Script.complete();
`;
}
