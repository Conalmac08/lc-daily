import { Card, PageTitle } from './common';

export function InstallGuide() {
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone;
  return (
    <div className="space-y-4">
      <PageTitle back>Install on your phone</PageTitle>
      {standalone && <Card className="bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">✅ You're already using the installed app.</Card>}
      <Card>
        <h2 className="mb-2 text-lg font-bold">📱 iPhone (Safari)</h2>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Open this site in <b>Safari</b> (most reliable on iPhone).</li>
          <li>Tap the <b>Share</b> button (square with an arrow).</li>
          <li>Scroll down and tap <b>Add to Home Screen</b>.</li>
          <li>Tap <b>Add</b>. Open LC Daily from your home screen from now on.</li>
        </ol>
        <p className="mt-2 text-sm text-slate-500">Installing is needed on iPhone for morning notifications (iOS 16.4 or later).</p>
      </Card>
      <Card>
        <h2 className="mb-2 text-lg font-bold">🤖 Android (Chrome)</h2>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Open this site in <b>Chrome</b>.</li>
          <li>Tap the <b>⋮</b> menu in the top right.</li>
          <li>Tap <b>Install app</b> (or <b>Add to Home screen</b>).</li>
          <li>Confirm. LC Daily appears with your other apps.</li>
        </ol>
      </Card>
      <p className="text-center text-sm text-slate-500">Once installed, the app works offline and keeps today's topics even with no signal.</p>
    </div>
  );
}
